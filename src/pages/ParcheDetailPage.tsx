
import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useStore } from '../store/StoreContext';
import PlanList from '../components/plans/PlanList';
import MemberRow from '../components/parches/MemberRow';
import RankingRow from '../components/rankings/RankingRow';
import Button from '../components/ui/Button';
import type { PlanState } from '../types';
import { FiPlus, FiUsers, FiClipboard, FiTrendingUp, FiCopy, FiCheck } from 'react-icons/fi';

export default function ParcheDetailPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { currentUser, getParcheById, getPlansByParche, getUserById, getMemberRole, setMemberRole, removeMember, getRankings } = useStore();
    const [tab, setTab] = useState<'plans' | 'members' | 'rankings'>('plans');
    const [copied, setCopied] = useState(false);

    const parche = getParcheById(id!);
    if (!parche || !currentUser) return <div className="empty-state"><h3>Parche no encontrado</h3><Link to="/parches" className="btn-primary">Volver</Link></div>;

    const plans = getPlansByParche(parche.id);
    const myRole = getMemberRole(parche.id, currentUser.id);
    const isOwner = myRole === 'OWNER';

    const copyCode = () => {
        navigator.clipboard.writeText(parche.inviteCode);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    // Rankings data
    const rankings = getRankings(parche.id);
    const sortedByOrganizer = [...rankings].sort((a, b) => b.organizerScore - a.organizerScore);
    const sortedByGhost = [...rankings].sort((a, b) => b.ghostScore - a.ghostScore);

    return (
        <div className="parche-detail">
            {/* Header con gradiente */}
            <div className="parche-detail-header" style={{ background: `linear-gradient(135deg, hsl(${parche.id.charCodeAt(1) * 30}, 70%, 45%), hsl(${parche.id.charCodeAt(1) * 30 + 60}, 80%, 35%))` }}>
                <Link to="/parches" className="back-link">← Volver</Link>
                <h1>{parche.name}</h1>
                <p>{parche.description}</p>
                <div className="parche-meta">
                    <span><FiUsers /> {parche.members.length} miembros</span>
                    <button onClick={copyCode} className="copy-code-btn-light">
                        {copied ? <FiCheck /> : <FiCopy />} {parche.inviteCode}
                    </button>
                </div>
            </div>

            {/* Tabs */}
            <div className="tabs">
                <button className={tab === 'plans' ? 'active' : ''} onClick={() => setTab('plans')}><FiClipboard /> Planes ({plans.length})</button>
                <button className={tab === 'members' ? 'active' : ''} onClick={() => setTab('members')}><FiUsers /> Miembros</button>
                <button className={tab === 'rankings' ? 'active' : ''} onClick={() => setTab('rankings')}><FiTrendingUp /> Rankings</button>
            </div>

            {/* Tab: Planes - usa PlanList */}
            {tab === 'plans' && (
                <div className="plans-tab">
                    {(myRole === 'OWNER' || myRole === 'MODERATOR') && (
                        <Button onClick={() => navigate(`/parches/${parche.id}/create-plan`)}>
                            <FiPlus /> Crear nuevo plan
                        </Button>
                    )}
                    <PlanList plans={plans} parcheId={parche.id} />
                </div>
            )}

            {/* Tab: Miembros - usa MemberRow */}
            {tab === 'members' && (
                <div className="members-list">
                    {parche.members.map(m => {
                        const user = getUserById(m.userId);
                        if (!user) return null;
                        return (
                            <MemberRow
                                key={m.userId}
                                userId={m.userId}
                                fullName={user.fullName}
                                email={user.email}
                                role={m.role}
                                isCurrentUser={m.userId === currentUser.id}
                                canManage={isOwner}
                                onPromote={(uid) => setMemberRole(parche.id, uid, 'MODERATOR')}
                                onDemote={(uid) => setMemberRole(parche.id, uid, 'MEMBER')}
                                onRemove={(uid) => removeMember(parche.id, uid)}
                            />
                        );
                    })}
                </div>
            )}

            {/* Tab: Rankings - usa RankingRow */}
            {tab === 'rankings' && (
                <div className="rankings-section">
                    <div className="ranking-card">
                        <h3>🏆 Organizer Score</h3>
                        <p className="ranking-subtitle">+1 plan creado, +2 plan programado</p>
                        <div className="ranking-list">
                            {sortedByOrganizer.map((r, i) => (
                                <RankingRow key={r.userId} position={i + 1} fullName={r.fullName} avatarUrl={r.avatarUrl} organizerScore={r.organizerScore} ghostScore={r.ghostScore} />
                            ))}
                        </div>
                    </div>
                    <div className="ranking-card ghost-card">
                        <h3>👻 Ghost Score</h3>
                        <p className="ranking-subtitle">Confirmó YES pero no hizo check-in</p>
                        <div className="ranking-list">
                            {sortedByGhost.map((r, i) => (
                                <RankingRow key={r.userId} position={i + 1} fullName={r.fullName} avatarUrl={r.avatarUrl} organizerScore={r.organizerScore} ghostScore={r.ghostScore} />
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
