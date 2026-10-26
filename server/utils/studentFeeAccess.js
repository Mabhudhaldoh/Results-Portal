const db = require("../config/database");

// Fee policy applies only to student accounts. A balance of $100 or less
// is automatically eligible; larger balances need BOTH finance approval and
// the headmaster's student-specific override.
exports.getStudentFeeAccess = async (student) => {
  const required = Number(student?.feesRequired || 0);
  const paid = Number(student?.feesPaid || 0);
  const balance = Math.max(0, Number((required - paid).toFixed(2)));
  const financeApproved = student?.financeResultsAccessApproved === true;
  const headmasterOverride = student?.headmasterResultsAccessOverride === true;
  const automaticAccess = balance <= 100;
  const canViewResults = automaticAccess || (financeApproved && headmasterOverride);
  let message = null;
  if (!canViewResults) {
    message = balance > 100
      ? (financeApproved
          ? "Your fees balance requires final approval from the headmaster. Please contact the school office."
          : "Your fees balance is $100 or more. Please contact the finance department to request permission to view results.")
      : "Your results are currently unavailable. Please contact the school office.";
  }
  return {
    feesRequired: required,
    feesPaid: paid,
    feesBalance: balance,
    automaticAccess,
    financeResultsAccessApproved: financeApproved,
    headmasterResultsAccessOverride: headmasterOverride,
    canViewResults,
    resultsAccessMessage: message,
  };
};

exports.getStudentFeeAccessById = async (studentId) => {
  const student = await db.collection("users").findById(studentId);
  if (!student || student.role !== "student") return null;
  return exports.getStudentFeeAccess(student);
};
