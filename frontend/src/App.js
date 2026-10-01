import Quizzes from '@/pages/Quizzes';
import Classes from '@/pages/Classes';
import SplashScreen from '@/components/SplashScreen';
import {Rubrics} from '@/pages/Assessment';
import BookQuiz from '@/pages/BookQuiz';
import {Videos} from '@/pages/Teaching';
import {Workspace,Notifications,Reports,Teachers,PasswordRecovery} from '@/pages/SchoolPages';
import {lazy,Suspense} from 'react';
import Activities from '@/pages/Activities';
import ActivityDetails from '@/pages/ActivityDetails';
import { ThemeProvider } from 'next-themes';
import TeacherPanel from '@/pages/TeacherPanel';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from '@/components/ui/sonner';
import ProtectedRoute from '@/components/ProtectedRoute';
import AuthPage from '@/pages/AuthPage';
import Dashboard from '@/pages/Dashboard';
import Library from '@/pages/Library';
import BookDetails from '@/pages/BookDetails';
import Editor from '@/pages/Editor';
import MySummaries from '@/pages/MySummaries';
import AdminSummaries from '@/pages/AdminSummaries';
import AdminAddBook from '@/pages/AdminAddBook';
import AdminBooks from '@/pages/AdminBooks';
import AdminTextProductions from '@/pages/AdminTextProductions';
import AdminUsers from '@/pages/AdminUsers';
import AdminMural from '@/pages/AdminMural';
import AdminCalendar from '@/pages/AdminCalendar';
import TextProductions from '@/pages/TextProductions';
import Profile from '@/pages/Profile';
import { isAuthenticated } from '@/lib/auth';
import '@/App.css';
import '@/studio.css';
import '@/login.css';
import '@/platform.css';
import '@/reading-identity.css';
import '@/modern.css';
import '@/workspace.css';

const Reader=lazy(()=>import('@/pages/Reader'));

function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} storageKey="eti-theme"><SplashScreen><div className="App">
      <BrowserRouter>
        <Routes><Route path="/quizzes" element={<ProtectedRoute><Quizzes/></ProtectedRoute>}/><Route path="/admin/classes" element={<ProtectedRoute><Classes/></ProtectedRoute>}/><Route path="/admin/classes/:turma" element={<ProtectedRoute><Classes/></ProtectedRoute>}/><Route path="/gradebook" element={<Navigate to="/admin/reports" replace/>}/><Route path="/admin/rubrics" element={<ProtectedRoute><Rubrics/></ProtectedRoute>}/><Route path="/videos" element={<ProtectedRoute><Videos/></ProtectedRoute>}/><Route path="/admin/assistant" element={<Navigate to="/admin/professor" replace/>}/>
          <Route path="/workspace" element={<ProtectedRoute><Workspace/></ProtectedRoute>}/>
          <Route path="/book/:id/quiz" element={<ProtectedRoute><BookQuiz/></ProtectedRoute>}/>
          <Route path="/notifications" element={<ProtectedRoute><Notifications/></ProtectedRoute>}/>
          <Route path="/admin/reports" element={<ProtectedRoute><Reports/></ProtectedRoute>}/>
          <Route path="/admin/teachers" element={<ProtectedRoute><Teachers/></ProtectedRoute>}/>
          <Route path="/forgot-password" element={<PasswordRecovery/>}/>
          <Route path="/reset-password" element={<PasswordRecovery/>}/>
          <Route path="/reader/:id" element={<ProtectedRoute><Suspense fallback={<p role="status" className="p-8">Preparando leitor…</p>}><Reader/></Suspense></ProtectedRoute>}/>
          <Route path="/activities" element={<ProtectedRoute><Activities/></ProtectedRoute>}/>
          <Route path="/activities/:id" element={<ProtectedRoute><ActivityDetails/></ProtectedRoute>}/>
          <Route path="/admin/activities" element={<ProtectedRoute><Activities/></ProtectedRoute>}/>
          <Route path="/admin/activities/:id" element={<ProtectedRoute><ActivityDetails/></ProtectedRoute>}/>
          <Route
            path="/"
            element={
              isAuthenticated() ? <Navigate to="/dashboard" replace /> : <Navigate to="/login" replace />
            }
          />
          <Route path="/admin/professor" element={<ProtectedRoute><TeacherPanel /></ProtectedRoute>} />
          <Route path="/login" element={<AuthPage />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/library"
            element={
              <ProtectedRoute>
                <Library />
              </ProtectedRoute>
            }
          />
          <Route
            path="/book/:id"
            element={
              <ProtectedRoute>
                <BookDetails />
              </ProtectedRoute>
            }
          />
          <Route
            path="/editor/:bookId"
            element={
              <ProtectedRoute>
                <Editor />
              </ProtectedRoute>
            }
          />
          <Route
            path="/summaries"
            element={
              <ProtectedRoute>
                <MySummaries />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/summaries"
            element={
              <ProtectedRoute>
                <AdminSummaries />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/add-book"
            element={
              <ProtectedRoute>
                <AdminAddBook />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/books"
            element={
              <ProtectedRoute>
                <AdminBooks />
              </ProtectedRoute>
            }
          />
          <Route
            path="/text-productions"
            element={
              <ProtectedRoute>
                <TextProductions />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/text-productions"
            element={
              <ProtectedRoute>
                <AdminTextProductions />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/users"
            element={
              <ProtectedRoute>
                <AdminUsers />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/mural"
            element={
              <ProtectedRoute>
                <AdminMural />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/calendar"
            element={
              <ProtectedRoute>
                <AdminCalendar />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
      <Toaster position="top-right" richColors />
    </div></SplashScreen></ThemeProvider>
  );
}

export default App;
