import { HashRouter, Routes, Route } from 'react-router-dom';
import WelcomePage from './pages/WelcomePage';
import TransferMethodPage from './pages/TransferMethodPage';
import PairingPage from './pages/PairingPage';
import ScanPreviewPage from './pages/ScanPreviewPage';
import TransferProgressPage from './pages/TransferProgressPage';
import CompletePage from './pages/CompletePage';

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<WelcomePage />} />
        <Route path="/method" element={<TransferMethodPage />} />
        <Route path="/pairing" element={<PairingPage />} />
        <Route path="/scan" element={<ScanPreviewPage />} />
        <Route path="/transfer" element={<TransferProgressPage />} />
        <Route path="/complete" element={<CompletePage />} />
      </Routes>
    </HashRouter>
  );
}
