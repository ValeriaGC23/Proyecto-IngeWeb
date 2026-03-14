import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import type { User, Parche, Plan, Vote, Attendance, ParcheRole, PlanState, AttendanceStatus, UserRanking, ParcheMember } from '../types';
import { VALID_TRANSITIONS } from '../types';
import { seedUsers, seedParches, seedPlans, seedVotes, seedAttendances } from '../data/seed';


const genId = () => Math.random().toString(36).slice(2, 10);

function loadOrSeed<T>(key: string, seed: T[]): T[] {
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw);
    localStorage.setItem(key, JSON.stringify(seed));
    return [...seed];
}


interface StoreContextType {
    // Auth
    currentUser: User | null;
    login: (email: string, password: string) => boolean;
    register: (data: Omit<User, 'id'>) => boolean;
    logout: () => void;
    updateProfile: (data: Partial<User>) => void;

    // Users
    users: User[];
    getUserById: (id: string) => User | undefined;

    // Parches
    parches: Parche[];
    createParche: (name: string, description: string, coverUrl: string) => Parche;
    joinParche: (code: string) => boolean;
    leaveParche: (parcheId: string) => void;
    getParcheById: (id: string) => Parche | undefined;
    getMemberRole: (parcheId: string, userId: string) => ParcheRole | null;
    setMemberRole: (parcheId: string, targetUserId: string, role: ParcheRole) => boolean;
    removeMember: (parcheId: string, targetUserId: string) => boolean;

    // Plans
    plans: Plan[];
    createPlan: (parcheId: string, title: string, description: string, dateWindow: { start: string; end: string }, options: { place: string; time: string }[]) => Plan;
    getPlansByParche: (parcheId: string) => Plan[];
    getPlanById: (id: string) => Plan | undefined;
    transitionPlanState: (planId: string) => boolean;

    // Votes
    votes: Vote[];
    castVote: (planId: string, optionId: string) => boolean;
    getUserVote: (planId: string, userId: string) => Vote | undefined;
    getVotesByPlan: (planId: string) => Vote[];

    // Attendance
    attendances: Attendance[];
    setAttendance: (planId: string, status: AttendanceStatus) => void;
    checkIn: (planId: string) => void;
    getAttendanceByPlan: (planId: string) => Attendance[];
    getUserAttendance: (planId: string, userId: string) => Attendance | undefined;

    // Rankings
    getRankings: (parcheId: string) => UserRanking[];
}

const StoreContext = createContext<StoreContextType | null>(null);

export function useStore(): StoreContextType {
    const ctx = useContext(StoreContext);
    if (!ctx) throw new Error('useStore must be used within StoreProvider');
    return ctx;
}


export function StoreProvider({ children }: { children: ReactNode }) {
    const [users, setUsers] = useState<User[]>(() => loadOrSeed('pp_users', seedUsers));
    const [parches, setParches] = useState<Parche[]>(() => loadOrSeed('pp_parches', seedParches));
    const [plans, setPlans] = useState<Plan[]>(() => loadOrSeed('pp_plans', seedPlans));
    const [votes, setVotes] = useState<Vote[]>(() => loadOrSeed('pp_votes', seedVotes));
    const [attendances, setAttendances] = useState<Attendance[]>(() => loadOrSeed('pp_attendances', seedAttendances));
    const [currentUser, setCurrentUser] = useState<User | null>(() => {
        const raw = localStorage.getItem('pp_currentUser');
        return raw ? JSON.parse(raw) : null;
    });

    // Persist
    useEffect(() => { localStorage.setItem('pp_users', JSON.stringify(users)); }, [users]);
    useEffect(() => { localStorage.setItem('pp_parches', JSON.stringify(parches)); }, [parches]);
    useEffect(() => { localStorage.setItem('pp_plans', JSON.stringify(plans)); }, [plans]);
    useEffect(() => { localStorage.setItem('pp_votes', JSON.stringify(votes)); }, [votes]);
    useEffect(() => { localStorage.setItem('pp_attendances', JSON.stringify(attendances)); }, [attendances]);
    useEffect(() => {
        if (currentUser) localStorage.setItem('pp_currentUser', JSON.stringify(currentUser));
        else localStorage.removeItem('pp_currentUser');
    }, [currentUser]);


    const login = useCallback((email: string, password: string): boolean => {
        const user = users.find(u => u.email === email && u.password === password);
        if (user) { setCurrentUser(user); return true; }
        return false;
    }, [users]);

    const register = useCallback((data: Omit<User, 'id'>): boolean => {
        if (users.find(u => u.email === data.email)) return false;
        const newUser: User = { ...data, id: genId() };
        setUsers(prev => [...prev, newUser]);
        setCurrentUser(newUser);
        return true;
    }, [users]);

    const logout = useCallback(() => setCurrentUser(null), []);

    const updateProfile = useCallback((data: Partial<User>) => {
        if (!currentUser) return;
        const updated = { ...currentUser, ...data };
        setCurrentUser(updated);
        setUsers(prev => prev.map(u => u.id === currentUser.id ? updated : u));
    }, [currentUser]);

    const getUserById = useCallback((id: string) => users.find(u => u.id === id), [users]);


    const createParche = useCallback((name: string, description: string, coverUrl: string): Parche => {
        const parche: Parche = {
            id: genId(),
            name,
            description,
            coverUrl,
            inviteCode: genId().toUpperCase().slice(0, 6),
            members: [{ userId: currentUser!.id, role: 'OWNER' }],
            createdAt: new Date().toISOString(),
        };
        setParches(prev => [...prev, parche]);
        return parche;
    }, [currentUser]);

    const joinParche = useCallback((code: string): boolean => {
        if (!currentUser) return false;
        const parche = parches.find(p => p.inviteCode === code);
        if (!parche) return false;
        if (parche.members.some(m => m.userId === currentUser.id)) return false;
        const updated = { ...parche, members: [...parche.members, { userId: currentUser.id, role: 'MEMBER' as ParcheRole }] };
        setParches(prev => prev.map(p => p.id === parche.id ? updated : p));
        return true;
    }, [currentUser, parches]);

    const leaveParche = useCallback((parcheId: string) => {
        if (!currentUser) return;
        setParches(prev => prev.map(p => p.id === parcheId ? { ...p, members: p.members.filter(m => m.userId !== currentUser.id) } : p));
    }, [currentUser]);

    const getParcheById = useCallback((id: string) => parches.find(p => p.id === id), [parches]);

    const getMemberRole = useCallback((parcheId: string, userId: string): ParcheRole | null => {
        const parche = parches.find(p => p.id === parcheId);
        if (!parche) return null;
        const member = parche.members.find(m => m.userId === userId);
        return member?.role ?? null;
    }, [parches]);

    const setMemberRole = useCallback((parcheId: string, targetUserId: string, role: ParcheRole): boolean => {
        if (!currentUser) return false;
        const parche = parches.find(p => p.id === parcheId);
        if (!parche) return false;
        const callerRole = parche.members.find(m => m.userId === currentUser.id)?.role;
        if (callerRole !== 'OWNER') return false;
        if (targetUserId === currentUser.id) return false;
        setParches(prev => prev.map(p =>
            p.id === parcheId
                ? { ...p, members: p.members.map(m => m.userId === targetUserId ? { ...m, role } : m) }
                : p
        ));
        return true;
    }, [currentUser, parches]);

    const removeMember = useCallback((parcheId: string, targetUserId: string): boolean => {
        if (!currentUser) return false;
        const parche = parches.find(p => p.id === parcheId);
        if (!parche) return false;
        const callerRole = parche.members.find(m => m.userId === currentUser.id)?.role;
        if (callerRole !== 'OWNER' && callerRole !== 'MODERATOR') return false;
        if (targetUserId === currentUser.id) return false;
        const targetMember = parche.members.find(m => m.userId === targetUserId);
        if (!targetMember) return false;
        if (callerRole === 'MODERATOR' && targetMember.role !== 'MEMBER') return false;
        setParches(prev => prev.map(p =>
            p.id === parcheId ? { ...p, members: p.members.filter(m => m.userId !== targetUserId) } : p
        ));
        return true;
    }, [currentUser, parches]);


    const createPlan = useCallback((parcheId: string, title: string, description: string, dateWindow: { start: string; end: string }, options: { place: string; time: string }[]): Plan => {
        const plan: Plan = {
            id: genId(),
            parcheId,
            title,
            description,
            dateWindow,
            options: options.map(o => ({ id: genId(), place: o.place, time: o.time, votesCount: 0 })),
            state: 'DRAFT',
            winningOptionId: null,
            createdBy: currentUser!.id,
            createdAt: new Date().toISOString(),
        };
        setPlans(prev => [...prev, plan]);
        return plan;
    }, [currentUser]);

    const getPlansByParche = useCallback((parcheId: string) => plans.filter(p => p.parcheId === parcheId), [plans]);

    const getPlanById = useCallback((id: string) => plans.find(p => p.id === id), [plans]);

    const transitionPlanState = useCallback((planId: string): boolean => {
        const plan = plans.find(p => p.id === planId);
        if (!plan || !currentUser) return false;
        // Check role
        const parche = parches.find(p => p.id === plan.parcheId);
        if (!parche) return false;
        const role = parche.members.find(m => m.userId === currentUser.id)?.role;
        if (role !== 'OWNER' && role !== 'MODERATOR') return false;
        const nextState = VALID_TRANSITIONS[plan.state];
        if (!nextState) return false;

        let winningOptionId = plan.winningOptionId;
        let updatedOptions = plan.options;


        if (nextState === 'VOTING_CLOSED') {
            const planVotes = votes.filter(v => v.planId === planId);
            updatedOptions = plan.options.map(opt => ({
                ...opt,
                votesCount: planVotes.filter(v => v.optionId === opt.id).length,
            }));
            const maxVotes = Math.max(...updatedOptions.map(o => o.votesCount));
            const tied = updatedOptions.filter(o => o.votesCount === maxVotes);
            // Tiebreaker: earliest time
            winningOptionId = tied.sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime())[0].id;
        }

        setPlans(prev => prev.map(p =>
            p.id === planId ? { ...p, state: nextState as PlanState, winningOptionId, options: updatedOptions } : p
        ));
        return true;
    }, [plans, parches, votes, currentUser]);


    const castVote = useCallback((planId: string, optionId: string): boolean => {
        if (!currentUser) return false;
        const plan = plans.find(p => p.id === planId);
        if (!plan || plan.state !== 'VOTING_OPEN') return false;
        // Check membership
        const parche = parches.find(p => p.id === plan.parcheId);
        if (!parche || !parche.members.some(m => m.userId === currentUser.id)) return false;

        const existingVote = votes.find(v => v.planId === planId && v.userId === currentUser.id);
        if (existingVote) {
            // Change vote
            const oldOptionId = existingVote.optionId;
            setVotes(prev => prev.map(v => v.id === existingVote.id ? { ...v, optionId } : v));
            setPlans(prev => prev.map(p =>
                p.id === planId
                    ? {
                        ...p,
                        options: p.options.map(o => {
                            if (o.id === oldOptionId) return { ...o, votesCount: Math.max(0, o.votesCount - 1) };
                            if (o.id === optionId) return { ...o, votesCount: o.votesCount + 1 };
                            return o;
                        }),
                    }
                    : p
            ));
        } else {
            // New vote
            setVotes(prev => [...prev, { id: genId(), planId, userId: currentUser.id, optionId }]);
            setPlans(prev => prev.map(p =>
                p.id === planId
                    ? { ...p, options: p.options.map(o => o.id === optionId ? { ...o, votesCount: o.votesCount + 1 } : o) }
                    : p
            ));
        }
        return true;
    }, [currentUser, plans, parches, votes]);

    const getUserVote = useCallback((planId: string, userId: string) => votes.find(v => v.planId === planId && v.userId === userId), [votes]);

    const getVotesByPlan = useCallback((planId: string) => votes.filter(v => v.planId === planId), [votes]);


    const setAttendance = useCallback((planId: string, status: AttendanceStatus) => {
        if (!currentUser) return;
        const existing = attendances.find(a => a.planId === planId && a.userId === currentUser.id);
        if (existing) {
            setAttendances(prev => prev.map(a =>
                a.id === existing.id ? { ...a, status } : a
            ));
        } else {
            setAttendances(prev => [...prev, { id: genId(), planId, userId: currentUser.id, status, checkedIn: false }]);
        }
    }, [currentUser, attendances]);

    const checkIn = useCallback((planId: string) => {
        if (!currentUser) return;
        setAttendances(prev => prev.map(a =>
            a.planId === planId && a.userId === currentUser.id ? { ...a, checkedIn: true, status: 'YES' as AttendanceStatus } : a
        ));
    }, [currentUser]);

    const getAttendanceByPlan = useCallback((planId: string) => attendances.filter(a => a.planId === planId), [attendances]);

    const getUserAttendance = useCallback((planId: string, userId: string) => attendances.find(a => a.planId === planId && a.userId === userId), [attendances]);


    const getRankings = useCallback((parcheId: string): UserRanking[] => {
        const parche = parches.find(p => p.id === parcheId);
        if (!parche) return [];
        const parcheMembers: ParcheMember[] = parche.members;
        const parcherPlans = plans.filter(p => p.parcheId === parcheId);

        return parcheMembers.map(member => {
            const user = users.find(u => u.id === member.userId);
            // Organizer score: +1 per plan created, +2 per plan SCHEDULED
            const createdPlans = parcherPlans.filter(p => p.createdBy === member.userId);
            const scheduledPlans = createdPlans.filter(p => p.state === 'SCHEDULED');
            const organizerScore = createdPlans.length + scheduledPlans.length * 2;

            // Ghost score: confirmed YES but didn't check in on SCHEDULED plans
            const scheduledPlanIds = parcherPlans.filter(p => p.state === 'SCHEDULED').map(p => p.id);
            const ghostScore = attendances.filter(
                a => scheduledPlanIds.includes(a.planId) && a.userId === member.userId && a.status === 'YES' && !a.checkedIn
            ).length;

            return {
                userId: member.userId,
                fullName: user?.fullName ?? 'Unknown',
                avatarUrl: user?.avatarUrl ?? '',
                organizerScore,
                ghostScore,
            };
        });
    }, [parches, plans, attendances, users]);

    const value: StoreContextType = {
        currentUser, login, register, logout, updateProfile,
        users, getUserById,
        parches, createParche, joinParche, leaveParche, getParcheById, getMemberRole, setMemberRole, removeMember,
        plans, createPlan, getPlansByParche, getPlanById, transitionPlanState,
        votes, castVote, getUserVote, getVotesByPlan,
        attendances, setAttendance, checkIn, getAttendanceByPlan, getUserAttendance,
        getRankings,
    };

    return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}
