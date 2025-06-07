import { BrowserRouter as Router, Routes, Route } from "react-router-dom"
import HomePage from "./pages/HomePage.jsx"
import AlbumsPage from "./pages/AlbumsPage.jsx"
import SavedPage from "./pages/SavedPage.jsx"
import NotificationPage from "./pages/NotificationPage.jsx"


function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/albums" element={<AlbumsPage />} />
        <Route path="/saved" element={<SavedPage />} />
        <Route path="/notification" element={<NotificationPage />} />
      </Routes>
    </Router>
  )
}

export default App
