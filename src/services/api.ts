/**
 * Async Fake API Layer
 * Wraps existing StoreContext operations with:
 *  - Simulated delay (400-800ms)
 *  - Typed ApiResult responses
 *  - 5% random network failure
 *  - All business rules enforced here
 */

import type {
  User, Parche, Plan, Vote, Attendance,
  ParcheRole, AttendanceStatus,
} from '../types';
import { VALID_TRANSITIONS } from '../types';
import { sleep, maybeNetworkError, canManagePlans, isOwner as checkIsOwner, isInDateWindow } from '../utils/helpers';

// ─── Types ──────────────────────────────────────────────────────

export type ApiErrorType = 'UNAUTHORIZED' | 'VALIDATION' | 'NETWORK' | 'NOT_FOUND';

export type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; type: ApiErrorType };

function success<T>(data: T): ApiResult<T> {
  return { ok: true, data };
}

function fail<T>(error: string, type: ApiErrorType): ApiResult<T> {
  return { ok: false, error, type };
}

// ─── Store accessor type (subset of StoreContext we need) ───────

export interface StoreAccessor {
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
}

// ─── API Functions ──────────────────────────────────────────────

export async function apiLogin(
  store: StoreAccessor,
  email: string,
  password: string
): Promise<ApiResult<User>> {
  await sleep();
  if (maybeNetworkError()) return fail('Error de conexión. Intenta de nuevo.', 'NETWORK');

  if (!email.trim() || !password.trim()) {
    return fail('Completa todos los campos', 'VALIDATION');
  }

  const ok = store.login(email, password);
  if (!ok) return fail('Credenciales incorrectas', 'VALIDATION');

  // After login, the store sets currentUser — find the user to return
  const user = store.users.find(u => u.email === email);
  return success(user!);
}

export async function apiRegister(
  store: StoreAccessor,
  data: Omit<User, 'id'>
): Promise<ApiResult<User>> {
  await sleep();
  if (maybeNetworkError()) return fail('Error de conexión. Intenta de nuevo.', 'NETWORK');

  if (!data.fullName.trim() || !data.email.trim() || !data.password.trim() || !data.major.trim()) {
    return fail('Completa todos los campos', 'VALIDATION');
  }

  const ok = store.register(data);
  if (!ok) return fail('El correo ya está registrado', 'VALIDATION');

  return success(store.currentUser!);
}

export async function apiCreateParche(
  store: StoreAccessor,
  name: string,
  description: string,
  coverUrl: string
): Promise<ApiResult<Parche>> {
  await sleep();
  if (maybeNetworkError()) return fail('Error de conexión. Intenta de nuevo.', 'NETWORK');

  if (!store.currentUser) return fail('Debes iniciar sesión', 'UNAUTHORIZED');
  if (!name.trim()) return fail('El nombre del parche es obligatorio', 'VALIDATION');
  if (!description.trim()) return fail('La descripción es obligatoria', 'VALIDATION');

  const parche = store.createParche(name, description, coverUrl);
  return success(parche);
}

export async function apiJoinParche(
  store: StoreAccessor,
  code: string
): Promise<ApiResult<Parche>> {
  await sleep();
  if (maybeNetworkError()) return fail('Error de conexión. Intenta de nuevo.', 'NETWORK');

  if (!store.currentUser) return fail('Debes iniciar sesión', 'UNAUTHORIZED');
  if (!code.trim()) return fail('Ingresa un código de invitación', 'VALIDATION');

  const parche = store.parches.find(p => p.inviteCode === code.trim());
  if (!parche) return fail('Código de invitación inválido. Verifica e intenta de nuevo.', 'NOT_FOUND');

  if (parche.members.some(m => m.userId === store.currentUser!.id)) {
    return fail('Ya eres miembro de este parche', 'VALIDATION');
  }

  const ok = store.joinParche(code.trim());
  if (!ok) return fail('No se pudo unir al parche', 'VALIDATION');
  return success(parche);
}

export async function apiCreatePlan(
  store: StoreAccessor,
  parcheId: string,
  title: string,
  description: string,
  dateWindow: { start: string; end: string },
  options: { place: string; time: string }[]
): Promise<ApiResult<Plan>> {
  await sleep();
  if (maybeNetworkError()) return fail('Error de conexión. Intenta de nuevo.', 'NETWORK');

  if (!store.currentUser) return fail('Debes iniciar sesión', 'UNAUTHORIZED');

  const parche = store.getParcheById(parcheId);
  if (!parche) return fail('Parche no encontrado', 'NOT_FOUND');

  const role = store.getMemberRole(parcheId, store.currentUser.id);
  if (!canManagePlans(role)) {
    return fail('Solo OWNER o MODERATOR pueden crear planes', 'UNAUTHORIZED');
  }

  if (!title.trim()) return fail('El título del plan es obligatorio', 'VALIDATION');
  if (!dateWindow.start || !dateWindow.end) return fail('Completa la ventana de fechas', 'VALIDATION');
  if (options.length < 3) return fail('El plan debe tener al menos 3 opciones', 'VALIDATION');
  if (options.some(o => !o.place.trim() || !o.time)) {
    return fail('Completa todas las opciones (lugar y hora)', 'VALIDATION');
  }

  const plan = store.createPlan(
    parcheId, title, description, dateWindow,
    options.map(o => ({ place: o.place, time: new Date(o.time).toISOString() }))
  );
  return success(plan);
}

export async function apiTransitionPlanState(
  store: StoreAccessor,
  planId: string
): Promise<ApiResult<Plan>> {
  await sleep();
  if (maybeNetworkError()) return fail('Error de conexión. Intenta de nuevo.', 'NETWORK');

  if (!store.currentUser) return fail('Debes iniciar sesión', 'UNAUTHORIZED');

  const plan = store.getPlanById(planId);
  if (!plan) return fail('Plan no encontrado', 'NOT_FOUND');

  const parche = store.getParcheById(plan.parcheId);
  if (!parche) return fail('Parche no encontrado', 'NOT_FOUND');

  const role = store.getMemberRole(plan.parcheId, store.currentUser.id);
  if (!canManagePlans(role)) {
    return fail('No tienes permisos para cambiar el estado del plan. Solo OWNER o MODERATOR pueden hacerlo.', 'UNAUTHORIZED');
  }

  const nextState = VALID_TRANSITIONS[plan.state];
  if (!nextState) {
    return fail('Este plan ya está en su estado final', 'VALIDATION');
  }

  const ok = store.transitionPlanState(planId);
  if (!ok) return fail('No se pudo cambiar el estado del plan', 'VALIDATION');

  const updated = store.getPlanById(planId);
  return success(updated!);
}

export async function apiCastVote(
  store: StoreAccessor,
  planId: string,
  optionId: string
): Promise<ApiResult<Vote>> {
  await sleep();
  if (maybeNetworkError()) return fail('Error de conexión. Intenta de nuevo.', 'NETWORK');

  if (!store.currentUser) return fail('Debes iniciar sesión', 'UNAUTHORIZED');

  const plan = store.getPlanById(planId);
  if (!plan) return fail('Plan no encontrado', 'NOT_FOUND');

  if (plan.state !== 'VOTING_OPEN') {
    return fail('La votación está cerrada. No puedes votar en este momento.', 'VALIDATION');
  }

  const parche = store.getParcheById(plan.parcheId);
  if (!parche || !parche.members.some(m => m.userId === store.currentUser!.id)) {
    return fail('No eres miembro de este parche', 'UNAUTHORIZED');
  }

  // Check existing vote
  const existingVote = store.getUserVote(planId, store.currentUser.id);
  if (existingVote && existingVote.optionId === optionId) {
    return fail('Ya votaste por esta opción. Selecciona otra opción para cambiar tu voto.', 'VALIDATION');
  }

  // If already voted, this will update; if not, will create
  const ok = store.castVote(planId, optionId);
  if (!ok) return fail('No se pudo registrar el voto', 'VALIDATION');

  const vote = store.getUserVote(planId, store.currentUser.id);
  return success(vote!);
}

export async function apiSetAttendance(
  store: StoreAccessor,
  planId: string,
  status: AttendanceStatus
): Promise<ApiResult<Attendance>> {
  await sleep();
  if (maybeNetworkError()) return fail('Error de conexión. Intenta de nuevo.', 'NETWORK');

  if (!store.currentUser) return fail('Debes iniciar sesión', 'UNAUTHORIZED');

  const plan = store.getPlanById(planId);
  if (!plan) return fail('Plan no encontrado', 'NOT_FOUND');

  if (plan.state !== 'SCHEDULED' && plan.state !== 'VOTING_CLOSED') {
    return fail('No puedes confirmar asistencia en este estado', 'VALIDATION');
  }

  store.setAttendance(planId, status);
  const attendance = store.getUserAttendance(planId, store.currentUser.id);
  return success(attendance!);
}

export async function apiCheckIn(
  store: StoreAccessor,
  planId: string
): Promise<ApiResult<Attendance>> {
  await sleep();
  if (maybeNetworkError()) return fail('Error de conexión. Intenta de nuevo.', 'NETWORK');

  if (!store.currentUser) return fail('Debes iniciar sesión', 'UNAUTHORIZED');

  const plan = store.getPlanById(planId);
  if (!plan) return fail('Plan no encontrado', 'NOT_FOUND');

  if (plan.state !== 'SCHEDULED') {
    return fail('El check-in solo está disponible para planes programados', 'VALIDATION');
  }

  if (!isInDateWindow(plan)) {
    return fail('El check-in no está disponible fuera de la ventana de tiempo del plan', 'VALIDATION');
  }

  const existing = store.getUserAttendance(planId, store.currentUser.id);
  if (existing?.checkedIn) {
    return fail('Ya realizaste el check-in', 'VALIDATION');
  }

  store.checkIn(planId);
  const attendance = store.getUserAttendance(planId, store.currentUser.id);
  return success(attendance!);
}

export async function apiSetMemberRole(
  store: StoreAccessor,
  parcheId: string,
  targetUserId: string,
  role: ParcheRole
): Promise<ApiResult<boolean>> {
  await sleep();
  if (maybeNetworkError()) return fail('Error de conexión. Intenta de nuevo.', 'NETWORK');

  if (!store.currentUser) return fail('Debes iniciar sesión', 'UNAUTHORIZED');

  const parche = store.getParcheById(parcheId);
  if (!parche) return fail('Parche no encontrado', 'NOT_FOUND');

  const callerRole = store.getMemberRole(parcheId, store.currentUser.id);
  if (!checkIsOwner(callerRole)) {
    return fail('Solo el OWNER puede gestionar roles', 'UNAUTHORIZED');
  }

  if (targetUserId === store.currentUser.id) {
    return fail('No puedes cambiar tu propio rol', 'VALIDATION');
  }

  const ok = store.setMemberRole(parcheId, targetUserId, role);
  if (!ok) return fail('No se pudo cambiar el rol', 'VALIDATION');
  return success(true);
}

export async function apiRemoveMember(
  store: StoreAccessor,
  parcheId: string,
  targetUserId: string
): Promise<ApiResult<boolean>> {
  await sleep();
  if (maybeNetworkError()) return fail('Error de conexión. Intenta de nuevo.', 'NETWORK');

  if (!store.currentUser) return fail('Debes iniciar sesión', 'UNAUTHORIZED');

  const parche = store.getParcheById(parcheId);
  if (!parche) return fail('Parche no encontrado', 'NOT_FOUND');

  const callerRole = store.getMemberRole(parcheId, store.currentUser.id);
  if (!canManagePlans(callerRole)) {
    return fail('No tienes permisos para expulsar miembros', 'UNAUTHORIZED');
  }

  const ok = store.removeMember(parcheId, targetUserId);
  if (!ok) return fail('No se pudo expulsar al miembro', 'VALIDATION');
  return success(true);
}

export async function apiUpdateProfile(
  store: StoreAccessor,
  data: Partial<User>
): Promise<ApiResult<User>> {
  await sleep();
  if (maybeNetworkError()) return fail('Error de conexión. Intenta de nuevo.', 'NETWORK');

  if (!store.currentUser) return fail('Debes iniciar sesión', 'UNAUTHORIZED');

  store.updateProfile(data);
  return success({ ...store.currentUser, ...data } as User);
}
