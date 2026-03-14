import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useStore } from '../store/StoreContext';
import { FiPlus, FiTrash2, FiMapPin, FiClock } from 'react-icons/fi';

export default function CreatePlanPage() {
    const { id: parcheId } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { createPlan, getParcheById, currentUser, getMemberRole } = useStore();
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [options, setOptions] = useState([
        { place: '', time: '' },
        { place: '', time: '' },
        { place: '', time: '' },
    ]);
    const [error, setError] = useState('');

    const parche = getParcheById(parcheId!);
    if (!parche || !currentUser) return null;
    const role = getMemberRole(parche.id, currentUser.id);
    if (role !== 'OWNER' && role !== 'MODERATOR') return <div className="empty-state"><h3>Sin permisos</h3><Link to={`/parches/${parcheId}`} className="btn-primary">Volver</Link></div>;

    const addOption = () => setOptions(prev => [...prev, { place: '', time: '' }]);
    const removeOption = (i: number) => { if (options.length <= 3) return; setOptions(prev => prev.filter((_, idx) => idx !== i)); };
    const updateOption = (i: number, field: 'place' | 'time', value: string) => {
        setOptions(prev => prev.map((o, idx) => idx === i ? { ...o, [field]: value } : o));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (!title.trim() || !startDate || !endDate) { setError('Completa título y ventana de fechas'); return; }
        if (options.some(o => !o.place.trim() || !o.time)) { setError('Completa todas las opciones (lugar y hora)'); return; }
        createPlan(parcheId!, title, description, { start: startDate, end: endDate }, options.map(o => ({ place: o.place, time: new Date(o.time).toISOString() })));
        navigate(`/parches/${parcheId}`);
    };

    return (
        <div className="create-plan-page">
            <Link to={`/parches/${parcheId}`} className="back-link">← Volver a {parche.name}</Link>
            <h1>Nuevo Plan</h1>

            <form onSubmit={handleSubmit} className="create-plan-form">
                <div className="form-section">
                    <label>Título del plan</label>
                    <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Ej: Hamburgueseada de viernes" required />
                </div>
                <div className="form-section">
                    <label>Descripción</label>
                    <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Describe el plan..." rows={3} />
                </div>
                <div className="form-row">
                    <div className="form-section">
                        <label>Fecha inicio</label>
                        <input type="datetime-local" value={startDate} onChange={e => setStartDate(e.target.value)} required />
                    </div>
                    <div className="form-section">
                        <label>Fecha fin</label>
                        <input type="datetime-local" value={endDate} onChange={e => setEndDate(e.target.value)} required />
                    </div>
                </div>

                <div className="form-section">
                    <label>Opciones (mínimo 3)</label>
                    {options.map((opt, i) => (
                        <div key={i} className="option-row">
                            <div className="option-fields">
                                <div className="input-group">
                                    <FiMapPin className="input-icon" />
                                    <input placeholder="Lugar" value={opt.place} onChange={e => updateOption(i, 'place', e.target.value)} />
                                </div>
                                <div className="input-group">
                                    <FiClock className="input-icon" />
                                    <input type="datetime-local" value={opt.time} onChange={e => updateOption(i, 'time', e.target.value)} />
                                </div>
                            </div>
                            {options.length > 3 && (
                                <button type="button" onClick={() => removeOption(i)} className="btn-icon btn-icon-danger"><FiTrash2 /></button>
                            )}
                        </div>
                    ))}
                    <button type="button" onClick={addOption} className="btn-ghost btn-sm"><FiPlus /> Agregar opción</button>
                </div>

                {error && <p className="auth-error">{error}</p>}

                <div className="modal-actions">
                    <Link to={`/parches/${parcheId}`} className="btn-ghost">Cancelar</Link>
                    <button type="submit" className="btn-primary">Crear plan como borrador</button>
                </div>
            </form>
        </div>
    );
}
