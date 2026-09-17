import { NavLink, Route, Routes } from 'react-router-dom';
import { useStore } from './storeContext';
import AdminBanner from './components/AdminBanner';
import HomePage from './pages/HomePage';
import PlayersPage from './pages/PlayersPage';
import SetupPage from './pages/SetupPage';
import GroupsPage from './pages/GroupsPage';
import BracketPage from './pages/BracketPage';
import MatchesPage from './pages/MatchesPage';
import TeamsPage from './pages/TeamsPage';

function linkClass({ isActive }: { isActive: boolean }) {
  return isActive ? 'active' : undefined;
}

export default function App() {
  const { loading, error, activeTournament } = useStore();

  return (
    <div className="app-shell">
      <nav className="nav">
        <div className="brand">FIFA CUP</div>
        <NavLink to="/" end className={linkClass}>
          Início
        </NavLink>
        <NavLink to="/players" className={linkClass}>
          Jogadores
        </NavLink>
        <NavLink to="/setup" className={linkClass}>
          Novo / Setup
        </NavLink>
        {activeTournament?.settings.fixedTeams && (
          <NavLink to="/teams" className={linkClass}>
            Times
          </NavLink>
        )}
        {activeTournament?.format === 'groups_knockout' && (
          <NavLink to="/groups" className={linkClass}>
            Grupos
          </NavLink>
        )}
        <NavLink to="/bracket" className={linkClass}>
          Chave
        </NavLink>
        <NavLink to="/matches" className={linkClass}>
          Jogos
        </NavLink>
      </nav>

      <AdminBanner />

      {loading && <p className="muted">Carregando…</p>}
      {error && <p className="error">{error}</p>}

      {!loading && (
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/players" element={<PlayersPage />} />
          <Route path="/setup" element={<SetupPage />} />
          <Route path="/teams" element={<TeamsPage />} />
          <Route path="/groups" element={<GroupsPage />} />
          <Route path="/bracket" element={<BracketPage />} />
          <Route path="/matches" element={<MatchesPage />} />
        </Routes>
      )}
    </div>
  );
}
