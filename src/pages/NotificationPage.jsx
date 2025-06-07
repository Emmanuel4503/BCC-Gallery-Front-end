import { Link } from "react-router-dom"
import { ArrowLeft, Bell } from "lucide-react"
import "../styles/SubPages.css"

function NotificationPage() {
  return (
    <div className="page-container">
      {/* Header */}
      <header className="page-header">
        <div className="page-header-content">
          <Link to="/" className="back-button">
            <ArrowLeft className="back-icon" />
          </Link>
          <h1 className="page-title">Notification</h1>
        </div>
      </header>

      {/* Main Content */}
      <main className="page-main">
        <div className="page-center">
          <div className="page-icon-container">
            <Bell className="page-icon" />
          </div>
          <h2 className="page-heading">Notification</h2>
          <p className="page-description">
            Stay updated with new photo uploads, and upcoming events. 
          </p>

          <div className="page-placeholder">
            <p className="placeholder-text">
              This features is coming soon
              {/* Notifications will be displayed here. You'll receive updates about new photos and church events! */}
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}

export default NotificationPage
