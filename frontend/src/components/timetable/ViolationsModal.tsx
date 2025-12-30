import { X, AlertCircle, XCircle, AlertTriangle } from 'lucide-react';

interface Violation {
  id: string;
  constraint_type: string;
  severity: string;
  description: string;
  affected_entities: any;
  created_at: string;
}

interface ViolationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  violations: Violation[];
  timetableName: string;
}

export default function ViolationsModal({
  isOpen,
  onClose,
  violations,
  timetableName
}: ViolationsModalProps) {
  if (!isOpen) return null;

  const getSeverityIcon = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'critical':
        return <XCircle className="h-5 w-5 text-red-600" />;
      case 'high':
        return <AlertCircle className="h-5 w-5 text-orange-600" />;
      case 'medium':
        return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
      default:
        return <AlertCircle className="h-5 w-5 text-blue-600" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'critical':
        return 'bg-red-50 border-red-200';
      case 'high':
        return 'bg-orange-50 border-orange-200';
      case 'medium':
        return 'bg-yellow-50 border-yellow-200';
      default:
        return 'bg-blue-50 border-blue-200';
    }
  };

  const groupedViolations = violations.reduce((acc, v) => {
    if (!acc[v.constraint_type]) {
      acc[v.constraint_type] = [];
    }
    acc[v.constraint_type].push(v);
    return acc;
  }, {} as Record<string, Violation[]>);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        {/* Backdrop */}
        <div
          className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75"
          onClick={onClose}
        />

        {/* Modal */}
        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
          {/* Header */}
          <div className="bg-white px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Constraint Violations
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  {timetableName} - {violations.length} violations found
                </p>
              </div>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-500 transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="bg-gray-50 px-6 py-4 max-h-[70vh] overflow-y-auto">
            {violations.length === 0 ? (
              <div className="text-center py-12">
                <AlertCircle className="h-12 w-12 text-green-500 mx-auto mb-3" />
                <p className="text-gray-600">No constraint violations found!</p>
                <p className="text-sm text-gray-500 mt-1">
                  All constraints are satisfied.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {Object.entries(groupedViolations).map(([type, typeViolations]) => (
                  <div key={type} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                    <div className="bg-gray-100 px-4 py-3 border-b border-gray-200">
                      <h4 className="font-semibold text-gray-900">
                        {type.replace(/_/g, ' ').toUpperCase()}
                        <span className="ml-2 text-sm font-normal text-gray-600">
                          ({typeViolations.length} violations)
                        </span>
                      </h4>
                    </div>
                    <div className="divide-y divide-gray-200">
                      {typeViolations.map((violation) => (
                        <div
                          key={violation.id}
                          className={`p-4 ${getSeverityColor(violation.severity)} border-l-4`}
                        >
                          <div className="flex items-start gap-3">
                            {getSeverityIcon(violation.severity)}
                            <div className="flex-1">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-semibold text-gray-700 uppercase">
                                  {violation.severity}
                                </span>
                              </div>
                              <p className="text-sm text-gray-900 mb-2">
                                {violation.description}
                              </p>
                              {violation.affected_entities && Object.keys(violation.affected_entities).length > 0 && (
                                <div className="mt-2 pt-2 border-t border-gray-200">
                                  <p className="text-xs font-medium text-gray-700 mb-1">
                                    Affected:
                                  </p>
                                  <div className="flex flex-wrap gap-2">
                                    {Object.entries(violation.affected_entities).map(([key, value]) => (
                                      <span
                                        key={key}
                                        className="inline-flex items-center px-2 py-1 rounded text-xs bg-white border border-gray-300"
                                      >
                                        <span className="font-medium text-gray-700">{key}:</span>
                                        <span className="ml-1 text-gray-900">{String(value)}</span>
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
            <button
              onClick={onClose}
              className="w-full sm:w-auto px-4 py-2 bg-gray-800 text-white rounded-md hover:bg-gray-700 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
