import { useContext } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import LoginView from '../views/LoginView';
import DashboardView from '../views/DashBoardView';
import DashboardLayout from '../layouts/DashboardLayout';
import UsersListView from '../views/UsersListView';
import InvitationsListView from '../views/InvitationListView';
import RoleRoute from './RoleRoute';

const ProtectedRoute = ({ children }) => {
    const { token } = useContext(AuthContext);
    return token ? children : <Navigate to="/login" replace />;
};

export default function AppRouter() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/login" element={<LoginView />} />

                <Route
                    path="/dashboard"
                    element={
                        <ProtectedRoute>
                            <DashboardLayout />
                        </ProtectedRoute>
                    }
                >
                    <Route index element={<DashboardView />} />

                    <Route
                        path="students"
                        element={
                            <RoleRoute action="student:view">
                                <UsersListView role="student" title="Alumnos" />
                            </RoleRoute>
                        }
                    />

                    <Route
                        path="teachers"
                        element={
                            <RoleRoute action="teacher:manage">
                                <UsersListView role="teacher" title="Docentes" />
                            </RoleRoute>
                        }
                    />

                    <Route
                        path="preceptors"
                        element={
                            <RoleRoute action="preceptor:manage">
                                <UsersListView role="preceptor" title="Preceptores" />
                            </RoleRoute>
                        }
                    />

                    <Route
                        path="directors"
                        element={
                            <RoleRoute action="director:manage">
                                <UsersListView role="director" title="Directivos" />
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
                </Route>

                <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>
        </BrowserRouter>
    );
}