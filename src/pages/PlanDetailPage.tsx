
import { useParams, Link } from 'react-router-dom';
import { useStore } from '../store/StoreContext';
import { VALID_TRANSITIONS } from '../types';
import type { PlanState, AttendanceStatus } from '../types';
import OptionCard from '../components/plans/OptionCard';
import AttendancePanel from '../components/attendance/AttendancePanel';
import AttendanceRow from '../components/attendance/AttendanceRow';
import Button from '../components/ui/Button';
import Badge, { planStateBadgeVariant } from '../components/ui/Badge';
import { FiArrowRight } from 'react-icons/fi';

const stateLabels: Record<PlanState, string> = {
    DRAFT: '📝 Borrador',
    VOTING_OPEN: '🗳️ Votación Abierta',
    VOTING_CLOSED: '🔒 Votación Cerrada',
    SCHEDULED: '📅 Programado',
};

const nextStateLabels: Record<PlanState, string> = {
    DRAFT: 'Abrir votación',
    VOTING_OPEN: 'Cerrar votación',
    VOTING_CLOSED: 'Programar plan',
    SCHEDULED: '',
};

export default function PlanDetailPage() {
    const { id: parcheId, planId } = useParams<{ id: string; planId: string }>();
    const {
        currentUser, getParcheById, getPlanById, getMemberRole,
        transitionPlanState, castVote, getUserVote,
        getAttendanceByPlan, setAttendance, checkIn, getUserAttendance,
        getUserById,
    } = useStore();

    const parche = getParcheById(parcheId!);
    const plan = getPlanById(planId!);
    if (!parche || !plan || !currentUser) return <div className="empty-state"><h3>Plan no encontrado</h3><Link to={`/parches/${parcheId}`} className="btn-primary">Volver</Link></div>;

    const myRole = getMemberRole(parche.id, currentUser.id);
    const canTransition = (myRole === 'OWNER' || myRole === 'MODERATOR') && VALID_TRANSITIONS[plan.state] !== null;
    const userVote = getUserVote(plan.id, currentUser.id);
    const totalVotes = plan.options.reduce((s, o) => s + o.votesCount, 0);
    const attendanceRecords = getAttendanceByPlan(plan.id);
    const myAttendance = getUserAttendance(plan.id, currentUser.id);

    const isInWindow = () => {
        const now = new Date();
        return now >= new Date(plan.dateWindow.start) && now <= new Date(plan.dateWindow.end);
    };

    const formatDate = (iso: string) => {
        const d = new Date(iso);
        return d.toLocaleDateString('es-CO', { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    };

    return (
        <div className="plan-detail">
            <Link to={`/parches/${parcheId}`} className="back-link">← {parche.name}</Link>

            {/* Header del plan */}
            <div className="plan-detail-header">
                <div className="plan-state-banner">
                    <Badge variant={planStateBadgeVariant(plan.state)}>
                        {stateLabels[plan.state]}
                    </Badge>
                </div>
                <h1>{plan.title}</h1>
                <p className="plan-detail-desc">{plan.description}</p>
            </div>

            {/* Botón de transición de estado - solo OWNER/MODERATOR */}
            {canTransition && (
                <Button onClick={() => transitionPlanState(plan.id)}>
                    <FiArrowRight /> {nextStateLabels[plan.state]}
                </Button>
            )}

            {/* Opciones / Votación - usa OptionCard */}
            <div className="plan-section">
                <h2>Opciones{plan.state === 'VOTING_OPEN' && ' — ¡Vota!'}</h2>
                <div className="options-list">
                    {plan.options.map((opt, index) => {
                        const pct = totalVotes > 0 ? Math.round((opt.votesCount / totalVotes) * 100) : 0;
                        return (
                            <OptionCard
                                key={opt.id}
                                option={opt}
                                index={index}
                                isVoted={userVote?.optionId === opt.id}
                                isWinner={plan.winningOptionId === opt.id}
                                isVotable={plan.state === 'VOTING_OPEN'}
                                percentage={pct}
                                onVote={(optionId) => castVote(plan.id, optionId)}
                                formatDate={formatDate}
                            />
                        );
                    })}
                </div>
            </div>

            {/* Asistencia - usa AttendancePanel y AttendanceRow */}
            {(plan.state === 'SCHEDULED' || plan.state === 'VOTING_CLOSED') && (
                <div className="plan-section">
                    <h2>Asistencia</h2>
                    <AttendancePanel
                        myAttendance={myAttendance}
                        isScheduled={plan.state === 'SCHEDULED'}
                        isInWindow={isInWindow()}
                        onSetAttendance={(status) => setAttendance(plan.id, status)}
                        onCheckIn={() => checkIn(plan.id)}
                    />

                    <div className="attendance-list">
                        <h3>Confirmaciones ({attendanceRecords.length})</h3>
                        {attendanceRecords.map(a => {
                            const user = getUserById(a.userId);
                            if (!user) return null;
                            return (
                                <AttendanceRow
                                    key={a.id}
                                    fullName={user.fullName}
                                    status={a.status}
                                    checkedIn={a.checkedIn}
                                />
                            );
                        })}
                        {attendanceRecords.length === 0 && <p className="text-muted">Nadie ha confirmado aún</p>}
                    </div>
                </div>
            )}
        </div>
    );
}
