interface Props {
  report: any;
}

export default function ReportCardView({ report }: Props) {
  const att = report.attendance;
  const attPercent = att && att.totalDays && att.daysPresent != null ? Math.round((att.daysPresent / att.totalDays) * 100) + '%' : '-';
  const classLabel = String(report.student?.className?.name || report.student?.className?.className || (typeof report.student?.className === 'string' ? report.student.className : '') || '').trim();
  const classDisplay = [report.student?.className?.name || (typeof report.student?.className === 'string' ? report.student.className : report.student?.className?.className), report.student?.stream?.name || (typeof report.student?.stream === 'string' ? report.student.stream : '')].filter(Boolean).join(' ');
  const fullName = [report.student?.firstName, report.student?.middleName, report.student?.lastName].filter(Boolean).join(' ') || report.student?.name || '-';
  const isAdvancedLevel = /lower\s*(six|6)|upper\s*(six|6)|form\s*6|sixth\s*form|advanced\s*level/i.test(classLabel);
  const gradeOf = (r: any) => String(r.grade || '').trim().toUpperCase();
  const aLevelPoints: Record<string, number> = { A: 5, B: 4, C: 3, D: 2, E: 1 };
  const isPass = (r: any) => isAdvancedLevel ? Object.prototype.hasOwnProperty.call(aLevelPoints, gradeOf(r)) : ['A', 'B', 'C'].includes(gradeOf(r));
  const reportResults = Array.isArray(report.results) ? report.results : [];
  const passedCount = reportResults.filter((r: any) => isPass(r)).length;
  const pointsFor = (r: any) => Number.isFinite(Number(r.points)) ? Number(r.points) : (aLevelPoints[gradeOf(r)] || 0);
  const totalPoints = (report.results || []).reduce((sum: number, r: any) => sum + (isAdvancedLevel ? pointsFor(r) : 0), 0);

  return (
    <>
      <style>{`
        .report-card-print { border: 2px solid #1e3a8a; border-radius: 10px; background: #ffffff !important; color: #111827 !important; box-shadow: 0 4px 24px rgba(0,0,0,0.1); overflow: hidden; width: 794px; max-width: 100%; font-family: Arial, Helvetica, sans-serif; }
        .report-card-print p, .report-card-print span, .report-card-print td, .report-card-print th, .report-card-print h1, .report-card-print h2, .report-card-print h3, .report-card-print div { color: inherit; }
        .report-card-print .text-mlk-blue { color: #1e3a8a !important; }
        .report-card-print .text-gray-400, .report-card-print .text-gray-500 { color: #4b5563 !important; }
        .report-card-print .report-header, .report-card-print .report-header h1, .report-card-print .report-header h2, .report-card-print .report-header p { color: #ffffff !important; }
        .report-card-print .report-table th { color: #ffffff !important; }
        .report-card-print .badge { color: #1f2937 !important; background: #e5e7eb !important; }
        .report-header { background: linear-gradient(135deg, #1e3a8a 0%, #b91c1c 100%); color: white; padding: 16px 20px; border-radius: 8px 8px 0 0; text-align: center; }
        .report-divider { height: 2px; background: linear-gradient(90deg, #1e3a8a, #b91c1c, #1e3a8a); margin: 10px 0; }
        .report-table th { background: #b91c1c; color: white; padding: 6px 8px; font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.04em; }
        .report-table td { padding: 5px 8px; border-bottom: 1px solid #e5e7eb; font-size: 0.78rem; }
        .report-table tr:nth-child(even) td { background: #f8fafc; }
        .report-footer { border-top: 2px solid #1e3a8a; margin-top: 16px; padding-top: 12px; }
        .report-contact { background: #f8fafc; border-top: 2px solid #b91c1c; padding: 8px 20px; text-align: center; font-size: 0.72rem; color: #374151; line-height: 1.5; }
        .pdf-capture .no-print { display: none !important; }
        @media print {
          .report-card-print { break-inside: avoid; page-break-inside: avoid; }
        }
      `}</style>

      <div className="report-card-print mx-auto">
        <div className="report-header">
          <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-2 overflow-hidden border-2 border-white shadow-md">
            <img src="/school_logo.png" alt="MLK" className="w-full h-full object-contain" onError={e => { e.currentTarget.style.display = 'none'; }} />
          </div>
          <h1 className="text-lg font-bold tracking-wide">MARTIN LUTHER KING JNR.</h1>
          <p className="text-sm opacity-90">Family of Schools</p>
          <p className="text-xs italic mt-0.5 opacity-80">Excellence in Education</p>
          <div className="report-divider" />
          <h2 className="text-base font-bold tracking-widest">STUDENT REPORT CARD</h2>
        </div>

        <div className="p-5">
          <div className="grid grid-cols-2 gap-x-8 gap-y-1 mb-4 text-sm border-b-2 border-gray-200 pb-3">
            <div>
              <p><span className="font-semibold text-mlk-blue">Name:</span> <span className="font-medium">{fullName}</span></p>
              <p><span className="font-semibold text-mlk-blue">Admission No:</span> <span className="font-mono">{report.student?.admissionNumber}</span></p>
              <p><span className="font-semibold text-mlk-blue">Gender:</span> {report.student?.gender || '-'}</p>
              <p><span className="font-semibold text-mlk-blue">Exam Board:</span> {report.student?.examBoard || report.results?.[0]?.examBoard || 'ZIMSEC'}</p>
            </div>
            <div>
              <p><span className="font-semibold text-mlk-blue">Class:</span> {classDisplay || '-'}</p>
              <p><span className="font-semibold text-mlk-blue">Term:</span> {report.term || '-'}</p>
              <p><span className="font-semibold text-mlk-blue">Academic Year:</span> {report.academicYear || '-'}</p>
            </div>
          </div>

          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-mlk-blue">{isAdvancedLevel ? 'Advanced Level (Lower Six / Upper Six)' : 'Ordinary Level (Form 1–4)'}</div>
          <table className="w-full mb-3 text-sm report-table">
            <thead><tr>
              <th className="text-left">Subject</th>
              <th className="text-center">Term Mark</th>
              <th className="text-center">Exam Mark</th>
              {!isAdvancedLevel && <th className="text-center">Project</th>}
              <th className="text-center">Final Mark (%)</th>
              <th className="text-center">Grade</th>
              {isAdvancedLevel && <th className="text-center">Points</th>}
              <th className="text-center">Result</th><th className="text-left">Remark</th>
            </tr></thead>
            <tbody>{reportResults.map((r: any) => <tr key={r._id}>
              <td className="font-medium">{r.subject?.name || '-'}</td>
              <td className="text-center">{r.termMark ?? '-'}</td>
              <td className="text-center">{r.examMark ?? '-'}</td>
              {!isAdvancedLevel && <td className="text-center">{r.projectMark ?? '-'}</td>}
              <td className="text-center font-bold text-mlk-blue">{r.finalMark ?? '-'}</td>
              <td className="text-center"><span className="badge badge-info">{gradeOf(r) || '-'}</span></td>
              {isAdvancedLevel && <td className="text-center font-bold">{pointsFor(r)}</td>}
              <td className="text-center font-semibold">{isPass(r) ? 'PASS' : 'FAIL'}</td>
              <td className="text-sm">{r.teacherRemark || '-'}</td>
            </tr>)}</tbody>
          </table>
          {!isAdvancedLevel && <p className="text-xs text-gray-500 mb-3">Form 1–4: grades A, B and C are passes. Grade D and below are fails.</p>}
          {isAdvancedLevel && <p className="text-xs text-gray-500 mb-3">Advanced Level points: A = 5, B = 4, C = 3, D = 2, E = 1. Grades below E are fails.</p>}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4 p-4 rounded-lg" style={{ background: 'linear-gradient(135deg, #eff6ff, #fef2f2)' }}>
            <div className="text-center border-r border-gray-300"><p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{isAdvancedLevel ? 'Total Points' : 'Subjects Passed'}</p><p className="text-2xl font-bold" style={{ color: '#b91c1c' }}>{isAdvancedLevel ? totalPoints : passedCount}</p></div>
            <div className="text-center border-r border-gray-300"><p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Subjects Taken</p><p className="text-2xl font-bold text-gray-800">{reportResults.length}</p></div>
            <div className="text-center"><p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Average Mark</p><p className="text-2xl font-bold text-gray-800">{report.average ?? '-'}%</p></div>
          </div>

          {(att || report.student?.sports) && (
            <div className="grid grid-cols-2 gap-4 mb-4">
              {att && (
                <div className="p-3 rounded-lg border border-gray-200">
                  <h3 className="text-xs font-bold text-mlk-blue mb-2 uppercase tracking-wide">Attendance</h3>
                  <div className="grid grid-cols-2 gap-y-1 text-sm">
                    <p><span className="font-semibold">Days Open:</span> <span className="font-medium">{att.totalDays ?? '-'}</span></p>
                    <p><span className="font-semibold">Days Present:</span> <span className="font-medium">{att.daysPresent ?? '-'}</span></p>
                    <p><span className="font-semibold">Days Absent:</span> <span className="font-medium">{att.daysAbsent ?? '-'}</span></p>
                    <p><span className="font-semibold">Attendance:</span> <span className="font-medium">{attPercent}</span></p>
                  </div>
                </div>
              )}
              {report.student?.sports && (
                <div className="p-3 rounded-lg border border-gray-200">
                  <h3 className="text-xs font-bold text-mlk-blue mb-2 uppercase tracking-wide">Sports / Extra-Curricular</h3>
                  <p className="text-sm">{report.student.sports}</p>
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-8 mt-5 pt-4 report-footer">
            <div>
              <div className="h-12 border-b-2 border-gray-400 mb-1 flex items-end justify-start">{report.settings?.headmasterSignature && <img src={report.settings.headmasterSignature} alt="Headmaster signature" className="max-h-12 max-w-full object-contain object-left-bottom" />}</div>
              <p className="text-sm font-semibold text-mlk-blue">Headmaster's Signature & Stamp</p>
              <p className="text-xs text-gray-400">Date: _______________</p>
            </div>
            <div>
              <div className="h-12 border-b-2 border-gray-400 mb-1"></div>
              <p className="text-sm font-semibold text-mlk-blue">Parent's / Guardian's Signature</p>
              <p className="text-xs text-gray-400">Date: _______________</p>
            </div>
          </div>

          <div className="report-contact">
            email: accounts@mlkschools.ac.zw &nbsp;|&nbsp; cell: +263 772 275 046<br />
            <em className="text-xs">"Quality Education To the Total Person for the Whole Nation"</em>
          </div>
        </div>
      </div>
    </>
  );
}
