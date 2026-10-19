
import { useContext } from 'react';

import {
    BrowserRouter,
    Routes,
    Route,
    Navigate,
} from 'react-router-dom';

import { AuthContext } from '../context/AuthContext';

import LoginView from '../views/LoginView';
import DashboardView from '../views/DashBoardView';
import DashboardLayout from '../layouts/DashboardLayout';

import UsersListView from '../views/UsersListView';
import InvitationsListView from '../views/InvitationListView';
import AcceptInvitationView from '../views/AcceptInvitationView';
import ProfileView from '../views/ProfileView';

import CareersListView from '../views/CareersListView';
import CoursesListView from '../views/CoursesListView';
import SubjectsListView from '../views/SubjectsListView';

import InstitutionView from '../views/InstitutionView';
import InstitutionFormView from '../views/InstitutionFormView';

import StudentCourseAssignmentsView from '../views/StudentCourseAssignmentView';
import TeacherSubjectAssignmentsView from '../views/TeacherSubjectAssignmentView';
import SubjectSchedulesView from '../views/SubjectSchedulesView';

import RoleRoute from './RoleRoute';
import TeacherSubjectsView from '../views/TeacherSubjectsView';
import EarlyNoticesView from '../views/EarlyNoticesView';
import InstitutionCommunicationsView from '../views/InstitutionCommunicationsView';

const ProtectedRoute = ({ children }) => {
    const { token } = useContext(AuthContext);

    return token
        ? children
        : <Navigate to="/login" replace />;
};

/**
 * Conecta la vista de Avisos Tempranos
 * con la sesión autenticada.
 *
 * La autorización de cada operación
 * sigue correspondiendo al backend.
 */
function EarlyNoticesRoute() {
    const { token, user } = useContext(AuthContext);

    return (
        <EarlyNoticesView
            token={token}
            currentUser={user}
        />
    );
}

export default function AppRoutes() {
    return (
        <BrowserRouter>
            <Routes>
                <Route
                    path="/login"
                    element={<LoginView />}
                />

                <Route
                    path="/aceptar-invitacion/:token"
                    element={<AcceptInvitationView />}
                />

                <Route
                    path="/dashboard"
                    element={
                        <ProtectedRoute>
                            <DashboardLayout />
                        </ProtectedRoute>
                    }
                >
                    <Route
                        index
                        element={<DashboardView />}
                    />

                    {/* Perfil: disponible para todo usuario autenticado */}
                    <Route
                        path="profile"
                        element={<ProfileView />}
                    />

                    <Route path="institution-communications" element={<InstitutionCommunicationsView />} />

                    <Route
                        path="early-notices"
                        element={<EarlyNoticesRoute />}
                    />

                    <Route
                        path="students"
                        element={
                            <RoleRoute action="student:view">
                                <UsersListView
                                    role="student"
                                    title="Alumnos"
                                />
                            </RoleRoute>
                        }
                    />

                    <Route
                        path="teachers"
                        element={
                            <RoleRoute action="teacher:manage">
                                <UsersListView
                                    role="teacher"
                                    title="Docentes"
                                />
                            </RoleRoute>
                        }
                    />

                    <Route
                        path="preceptors"
                        element={
                            <RoleRoute action="preceptor:manage">
                                <UsersListView
                                    role="preceptor"
                                    title="Preceptores"
                                />
                            </RoleRoute>
                        }
                    />

                    <Route
                        path="directors"
                        element={
                            <RoleRoute action="director:manage">
                                <UsersListView
                                    role="director"
                                    title="Directivos"
                                />
                            </RoleRoute>
                        }
                    />

                    <Route
                        path="invitations"
                        element={
                            <RoleRoute action="invitation:manage">
                                <InvitationsListView />
                            </RoleRoute>
                        }
                    />

                    <Route
                        path="careers"
                        element={
                            <RoleRoute action="career:manage">
                                <CareersListView />
                            </RoleRoute>
                        }
                    />

                    <Route
                        path="courses"
                        element={
                            <RoleRoute action="course:manage">
                                <CoursesListView />
                            </RoleRoute>
                        }
                    />

                    <Route
                        path="subjects"
                        element={
                            <RoleRoute action="subject:manage">
                                <SubjectsListView />
                            </RoleRoute>
                        }
                    />

                    <Route
                        path="my-subjects"
                        element={
                            <RoleRoute action="subjectContent:manage">
                                <TeacherSubjectsView />
                            </RoleRoute>
                        }
                    />

                    <Route
                        path="institution"
                        element={
                            <RoleRoute action="institution:manage">
                                <InstitutionView />
                            </RoleRoute>
                        }
                    />

                    <Route
                        path="institution/new"
                        element={
                            <RoleRoute action="institution:manage">
                                <InstitutionFormView />
                            </RoleRoute>
                        }
                    />

                    <Route
                        path="institution/:id/edit"
                        element={
                            <RoleRoute action="institution:manage">
                                <InstitutionFormView />
                            </RoleRoute>
                        }
                    />

                    <Route
                        path="assignments/students"
                        element={
                            <RoleRoute action="student:enroll">
                                <StudentCourseAssignmentsView />
                            </RoleRoute>
                        }
                    />

                    <Route
                        path="assignments/teachers"
                        element={
                            <RoleRoute action="teacher:assignSubject">
                                <TeacherSubjectAssignmentsView />
                            </RoleRoute>
                        }
                    />

                    <Route
                        path="assignments/schedules"
                        element={
                            <RoleRoute action="schedule:manage">
                                <SubjectSchedulesView />
                            </RoleRoute>
                        }
                    />
                </Route>

                <Route
                    path="*"
                    element={<Navigate to="/login" replace />}
                />
            </Routes>
        </BrowserRouter>
    );
}
