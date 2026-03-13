// Componente panel de asistencia.
// Mismo patrón que CartPanel: encapsula la lógica de asistencia y check-in del plan.
import type { Attendance, AttendanceStatus } from '../../types';
import Button from '../ui/Button';
import { FiCheck, FiX, FiHelpCircle } from 'react-icons/fi';

type Props = {
  myAttendance: Attendance | undefined;
  isScheduled: boolean;
  isInWindow: boolean;
  onSetAttendance: (status: AttendanceStatus) => void;
  onCheckIn: () => void;
};

export default function AttendancePanel({ myAttendance, isScheduled, isInWindow, onSetAttendance, onCheckIn }: Props) {
  return (
    <div className="attendance-actions-panel">
      <h3>Tu asistencia</h3>
      <div className="attendance-actions">
        {(['YES', 'NO', 'MAYBE'] as AttendanceStatus[]).map(status => {
          const icons = { YES: <FiCheck />, NO: <FiX />, MAYBE: <FiHelpCircle /> };
          const labels = { YES: 'Sí voy', NO: 'No voy', MAYBE: 'Tal vez' };
          const isActive = myAttendance?.status === status;
          return (
            <button
              key={status}
              onClick={() => onSetAttendance(status)}
              className={`btn-attendance att-${status.toLowerCase()} ${isActive ? 'active' : ''}`}
            >
              {icons[status]} {labels[status]}
            </button>
          );
        })}
      </div>

      {isScheduled && (
        <button
          onClick={onCheckIn}
          className={`btn-checkin ${myAttendance?.checkedIn ? 'checked' : ''}`}
          disabled={myAttendance?.checkedIn || !isInWindow}
        >
          {myAttendance?.checkedIn
            ? '✅ Check-in realizado'
            : isInWindow
              ? '📍 Hacer Check-in'
              : '⏳ Check-in no disponible aún'}
        </button>
      )}
    </div>
  );
}
