import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/layout/Layout';
import { LeaderboardPage } from './pages/leaderboard/LeaderboardPage';
import { RunnersListPage } from './pages/runner/RunnersListPage';
import { RunnerPage } from './pages/runner/RunnerPage';
import { RacesListPage } from './pages/race/RacesListPage';
import { RacePage } from './pages/race/RacePage';
import { CoursesListPage } from './pages/course/CoursesListPage';
import { CoursePage } from './pages/course/CoursePage';
import { AdminPage } from './pages/admin/AdminPage';
import { ScrapingPage } from './pages/admin/ScrapingPage';
import { RaceUrlTesterPage } from './pages/admin/RaceUrlTesterPage';
import { DataProvider } from './contexts/DataContext';

function App() {
  return (
    <DataProvider>
      <Router>
        <Layout>
          <Routes>
            <Route path="/" element={<Navigate to="/leaderboard" replace />} />
            <Route path="/leaderboard" element={<LeaderboardPage />} />
            <Route path="/runners" element={<RunnersListPage />} />
            <Route path="/runner/:id" element={<RunnerPage />} />
            <Route path="/races" element={<RacesListPage />} />
            <Route path="/race/:id" element={<RacePage />} />
            <Route path="/courses" element={<CoursesListPage />} />
            <Route path="/course/:id" element={<CoursePage />} />
            <Route path="/admin" element={<AdminPage />} />
            <Route path="/admin/scraping" element={<ScrapingPage />} />
            <Route path="/admin/race-url-tester" element={<RaceUrlTesterPage />} />
            <Route path="*" element={<Navigate to="/leaderboard" replace />} />
          </Routes>
        </Layout>
      </Router>
    </DataProvider>
  );
}

export default App;