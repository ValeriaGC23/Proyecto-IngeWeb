
import { useState } from 'react';
import { useStore } from '../store/StoreContext';
import ParcheList from '../components/parches/ParcheList';
import Button from '../components/ui/Button';
import StateMessage from '../components/ui/StateMessage';
import { FiPlus, FiLogIn } from 'react-icons/fi';

export default function ParchesPage() {
    const { currentUser, parches, createParche, joinParche } = useStore();
    const [showCreate, setShowCreate] = useState(false);
    const [name, setName] = useState('');
    const [desc, setDesc] = useState('');
    const [coverUrl, setCoverUrl] = useState('');
    const [inviteCode, setInviteCode] = useState('');
    const [joinMsg, setJoinMsg] = useState('');

    if (!currentUser) return null;

    const myParches = parches.filter(p => p.members.some(m => m.userId === currentUser.id));

    const handleCreate = (e: React.FormEvent) => {
        e.preventDefault();
        createParche(name, desc, coverUrl || '');
        setName(''); setDesc(''); setCoverUrl('');
        setShowCreate(false);
    };

    const handleJoin = () => {
        if (!inviteCode.trim()) return;
        const ok = joinParche(inviteCode.trim());
        setJoinMsg(ok ? '¡Te uniste al parche!' : 'Código no encontrado o ya eres miembro');
        setInviteCode('');
        setTimeout(() => setJoinMsg(''), 3000);
    };

    return (
        <div className="page-parches">
            <div className="page-header">
                <h1>Mis Parches</h1>
                <Button onClick={() => setShowCreate(!showCreate)}>
                    <FiPlus /> {showCreate ? 'Cancelar' : 'Crear parche'}
                </Button>
            </div>

            {/* Formulario de creación */}
            {showCreate && (
                <form className="create-form" onSubmit={handleCreate}>
                    <h3>Nuevo Parche</h3>
                    <input className="form-input" placeholder="Nombre del parche" value={name} onChange={e => setName(e.target.value)} required />
                    <input className="form-input" placeholder="Descripción" value={desc} onChange={e => setDesc(e.target.value)} required />
                    <input className="form-input" placeholder="URL de portada (opcional)" value={coverUrl} onChange={e => setCoverUrl(e.target.value)} />
                    <Button type="submit">Crear</Button>
                </form>
            )}

            {/* Join con código */}
            <div className="join-section">
                <input className="form-input" placeholder="Código de invitación" value={inviteCode} onChange={e => setInviteCode(e.target.value)} />
                <Button variant="secondary" onClick={handleJoin}><FiLogIn /> Unirse</Button>
                {joinMsg && <span className="join-msg">{joinMsg}</span>}
            </div>

            {/* Lista de parches del usuario */}
            {myParches.length === 0
                ? <StateMessage type="empty" title="No tienes parches" description="Crea uno o únete con un código de invitación" />
                : <ParcheList parches={myParches} currentUserId={currentUser.id} />
            }
        </div>
    );
}
