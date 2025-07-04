import { Link } from "react-router-dom";
import { ArrowLeft, ImageIcon, ChevronDown, Download, X, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import "../styles/SubPages.css";


function AlbumsPage() {
  const [albums, setAlbums] = useState([]);
  const [albumImages, setAlbumImages] = useState({});
  const [albumLoading, setAlbumLoading] = useState({});
  const [albumErrors, setAlbumErrors] = useState({});
  const [openAlbum, setOpenAlbum] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [fullscreenImage, setFullscreenImage] = useState(null);
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [selectedFormat, setSelectedFormat] = useState('png');
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [currentDownloadImage, setCurrentDownloadImage] = useState(null);
  const [totalImages, setTotalImages] = useState(0);  

  // Split title into event name and date
  const splitTitle = (title) => {
    const match = title.match(/^(.*?)\s*(\(.*\))$/);
    if (match) {
      return [match[1].trim(), match[2]];
    }
    return [title, ""];
  };

  useEffect(() => {
    setIsLoading(true);
    fetch("https://bcc-gallery-back-end-production.up.railway.app/album/get")
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }
        return response.json();
      })
      .then(async (data) => {
        const validAlbums = data
          .filter((album) => album && (album.title || album._id))
          .map((album, index) => ({
            ...album,
            displayName: album.title || album._id || `Album ${index + 1}`,
          }));
        setAlbums(validAlbums);
  
        // Fetch image counts for all albums silently
        let total = 0;
        for (const album of validAlbums) {
          const count = await fetchAlbumImages(album.displayName, true);
          total += count;
        }
        setTotalImages(total);
        setIsLoading(false);
      })
      .catch((error) => {
        console.error("Error fetching albums:", error);
        setError("Failed to load albums. Please try again later.");
        setIsLoading(false);
      });
  }, []);

  const fetchAlbumImages = async (albumTitle, silent = false) => {
    if (!albumTitle || typeof albumTitle !== 'string') {
      setAlbumErrors((prev) => ({ ...prev, [albumTitle]: 'Invalid album title' }));
      return 0; // Return 0 for invalid title
    }
  
    try {
      if (!silent) {
        setAlbumLoading((prev) => ({ ...prev, [albumTitle]: true }));
        setAlbumErrors((prev) => ({ ...prev, [albumTitle]: null }));
      }
  
      const response = await fetch(`https://bcc-gallery-back-end-production.up.railway.app/images/album/${encodeURIComponent(albumTitle)}`, {
        mode: 'cors',
        credentials: 'same-origin',
      });
  
      if (!response.ok) {
        throw new Error(`Failed to fetch images for album ${albumTitle}: ${response.status}`);
      }
  
      const data = await response.json();
      if (!Array.isArray(data)) {
        throw new Error('Invalid response: Expected an array of images');
      }
  
      const processedData = data.map((image) => {
        let imageUrl = image.imageUrl;
        let thumbnailUrl = image.thumbnailUrl || image.imageUrl;
        if (imageUrl && !imageUrl.startsWith('http')) {
          imageUrl = `https://bcc-gallery-back-end-production.up.railway.app${imageUrl.startsWith('/') ? imageUrl : `/${imageUrl}`}`;
        }
        if (thumbnailUrl && !thumbnailUrl.startsWith('http')) {
          thumbnailUrl = `https://bcc-gallery-back-end-production.up.railway.app${thumbnailUrl.startsWith('/') ? thumbnailUrl : `/${thumbnailUrl}`}`;
        }
        return { ...image, imageUrl, thumbnailUrl };
      });
  
      if (!silent) {
        setAlbumImages((prev) => ({ ...prev, [albumTitle]: processedData }));
        setAlbumErrors((prev) => ({ ...prev, [albumTitle]: null }));
      }
      return processedData.length; // Return image count
    } catch (error) {
      console.error(`Error fetching images for album ${albumTitle}:`, error);
      if (!silent) {
        setAlbumErrors((prev) => ({ ...prev, [albumTitle]: `Failed to load images: ${error.message}` }));
        setAlbumImages((prev) => ({ ...prev, [albumTitle]: [] }));
      }
      return 0; // Return 0 on error
    } finally {
      if (!silent) {
        setAlbumLoading((prev) => ({ ...prev, [albumTitle]: false }));
      }
    }
  };

  // Toggle album dropdown
  const toggleAlbum = (albumTitle) => {
    if (openAlbum === albumTitle) {
      setOpenAlbum(null);
    } else {
      setOpenAlbum(albumTitle);
      if (!albumImages[albumTitle] && !albumErrors[albumTitle] && !albumLoading[albumTitle]) {
        fetchAlbumImages(albumTitle);
      }
    }
  };

  // Download image function
  const downloadImage = async (imageUrl, filename, format) => {
    try {
      let processedUrl = imageUrl;
      if (imageUrl.startsWith('/')) {
        processedUrl = `https://res.cloudinary.com/dqxhczhxk/image/upload${imageUrl}`;
      } else if (!imageUrl.startsWith('http')) {
        processedUrl = `https://res.cloudinary.com/dqxhczhxk/image/upload/${imageUrl}`;
      }

      // For HEIC, use Cloudinary's transformation to convert to HEIC
      if (format === 'heic') {
        // Add f_heic to the Cloudinary URL
        const heicUrl = processedUrl.replace('/image/upload/', '/image/upload/f_heic/');
        console.log('Fetching HEIC image from:', heicUrl);

        const response = await fetch(heicUrl, {
          mode: 'cors',
          credentials: 'same-origin',
        });

        if (!response.ok) {
          const text = await response.text();
          throw new Error(`Failed to fetch HEIC image: ${response.status} ${response.statusText} - ${text.slice(0, 100)}`);
        }

        const blob = await response.blob();
        if (!blob.type.startsWith('image/')) {
          throw new Error(`Downloaded content is not an image: ${blob.type}`);
        }

        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${filename}.heic`;
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        return;
      }

      // Existing logic for JPEG, PNG, WebP
      console.log('Fetching image from:', processedUrl);

      const response = await fetch(processedUrl, {
        mode: 'cors',
        credentials: 'same-origin',
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
      }

      const blob = await response.blob();
      if (!blob.type.startsWith('image/')) {
        throw new Error('Downloaded content is not an image');
      }

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = document.createElement('img');

      return new Promise((resolve, reject) => {
        img.onload = () => {
          try {
            canvas.width = img.width;
            canvas.height = img.height;
            ctx.drawImage(img, 0, 0);

            const mimeType =
              format === 'png' ? 'image/png' : format === 'webp' ? 'image/webp' : 'image/jpeg';
            const quality = format === 'jpeg' ? 0.95 : undefined;

            canvas.toBlob(
              (convertedBlob) => {
                if (convertedBlob) {
                  const url = URL.createObjectURL(convertedBlob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `${filename}.${format}`;
                  a.style.display = 'none';
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                  URL.revokeObjectURL(url);
                  resolve();
                } else {
                  reject(new Error('Failed to convert image to selected format'));
                }
              },
              mimeType,
              quality
            );
          } catch (error) {
            reject(new Error(`Canvas processing failed: ${error.message}`));
          }
        };

        img.onerror = () => reject(new Error('Failed to load image for processing'));
        img.crossOrigin = 'anonymous';
        img.src = URL.createObjectURL(blob);
      });
    } catch (error) {
      console.error('Download error:', error);
      throw error;
    }
};

  // Handle image download
  const handleDownload = (imageUrl) => {
    setCurrentDownloadImage(imageUrl);
    setShowDownloadModal(true);
  };

  const handleSingleDownload = async () => {
    if (!currentDownloadImage) {
      alert('No image selected for download');
      return;
    }

    setIsDownloading(true);
    setDownloadProgress(0);

    try {
      const progressInterval = setInterval(() => {
        setDownloadProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 15;
        });
      }, 200);

      await downloadImage(
        currentDownloadImage,
        `BCC Picture-${Date.now()}`,
        selectedFormat
      );

      clearInterval(progressInterval);
      setDownloadProgress(100);

      setTimeout(() => {
        setShowDownloadModal(false);
        setIsDownloading(false);
        setDownloadProgress(0);
        setCurrentDownloadImage(null);
        alert('Image downloaded successfully!');
      }, 1000);
    } catch (error) {
      console.error('Download failed:', error);
      alert(`Failed to download image: ${error.message}`);
      setIsDownloading(false);
      setDownloadProgress(0);
    }
  };

  const closeDownloadModal = () => {
    if (!isDownloading) {
      setShowDownloadModal(false);
      setCurrentDownloadImage(null);
      setDownloadProgress(0);
      setSelectedFormat('png');
    }
  };

  // Open/close fullscreen image
  const openFullscreen = (imageUrl) => {
    setFullscreenImage(imageUrl);
  };

  const closeFullscreen = () => {
    setFullscreenImage(null);
  };

  // Handle Escape key for fullscreen and download modal
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === "Escape") {
        closeFullscreen();
        closeDownloadModal();
      }
    };

    if (fullscreenImage || showDownloadModal) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "unset";
    };
  }, [fullscreenImage, showDownloadModal]);

  return (
    <div className="page-container">
      {/* Header */}
      <header className="page-header">
        <div className="page-header-content">
          <Link to="/" className="back-button">
            <ArrowLeft className="back-icon" />
          </Link>
          <h1 className="page-title">Albums</h1>
        </div>
      </header>

      {/* Main Content */}
      <main className="page-main">
        <div className="page-center">
          <div className="page-icon-container">
            <ImageIcon className="page-icon" />
          </div>
          <h2 className="page-heading">Albums</h2>
          <p className="page-description">
            Welcome to the Albums section! Here you'll find all the pictures from the church events and services, categorized.
          </p>
          <br />

          <hr />
          <div className="albums-container" style={{ marginTop: "2rem" }}>
          {isLoading ? (
  <div className="page-placeholder">
    <div className="placeholder-loading" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
      <div className="global-spinner"></div>
      <p style={{ color: '#6b7280' }}>Loading albums...</p>
    </div>
  </div>
) : error ? (
              <div className="page-placeholder">
                <p className="placeholder-te" style={{ color: "#b91c1c" }}>
                  {error}
                </p>
              </div>
            ) : albums.length > 0 ? (
              <>
               <p style={{ color: "#6b7280", marginBottom: "1rem" }}>
  Found {albums.length} album{albums.length !== 1 ? "s" : ""} with {totalImages} image{totalImages !== 1 ? "s" : ""}
</p>
                {albums.map((album, index) => {
                  const [eventName, date] = splitTitle(album.displayName);
                  return (
                    <div key={`album-${album.displayName}-${index}`} style={{ marginBottom: "1rem" }}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          padding: "1rem",
                          backgroundColor: "#f9fafb",
                          borderRadius: "0.5rem",
                          cursor: "pointer",
                          transition: "background-color 0.2s",
                        }}
                        onClick={() => toggleAlbum(album.displayName)}
                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#f3f4f6")}
                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#f9fafb")}
                      >
                        <span className="service-title">
                          {eventName}
                          {date && (
                            <span style={{ display: "block", fontSize: "1rem", fontWeight: "normal" }}>
                              {date}
                            </span>
                          )}
                          <b className="welcome-underline"></b>
                        </span>
                        <ChevronDown
                          style={{
                            height: "1.5rem",
                            width: "1.5rem",
                            color: "#374151",
                            transform: openAlbum === album.displayName ? "rotate(180deg)" : "rotate(0deg)",
                            transition: "transform 0.2s",
                          }}
                        />
                      </div>
                      {openAlbum === album.displayName && (
                        <div
                          style={{
                            padding: "1rem",
                            backgroundColor: "#ffffff",
                            borderRadius: "0.5rem",
                            marginTop: "0.5rem",
                            boxShadow: "0 2px 4px rgba(0, 0, 0, 0.06)",
                          }}
                        >
                          {albumErrors[album.displayName] ? (
                            <p style={{ color: "#b91c1c", fontStyle: "italic" }}>
                              {albumErrors[album.displayName]}
                            </p>
                          ) : albumLoading[album.displayName] ? (
                            <p style={{ color: "#6b7280", fontStyle: "italic" }}>
                              Loading images...
                            </p>
                          ) : albumImages[album.displayName]?.length > 0 ? (
                            <div
                              style={{
                                display: "grid",
                                gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
                                gap: "1rem",
                              }}
                            >
                              {albumImages[album.displayName].map((image, index) => (
                                <div
                                  key={`image-${album.displayName}-${image._id || index}`}
                                  style={{
                                    position: "relative",
                                    overflow: "hidden",
                                    borderRadius: "0.5rem",
                                  }}
                                >
                                  <img
                                    src={image.thumbnailUrl || image.imageUrl || 'data:image/gif;base64,R0lGODlhAQABAIAAAMLCwgAAACH5BAAAAAAALAAAAAABAAEAAAICRAEAOw=='}
                                    alt={`Image ${index + 1}`}
                                    loading="lazy"
                                    style={{
                                      width: "100%",
                                      height: "150px",
                                      objectFit: "cover",
                                      display: "block",
                                      cursor: "pointer",
                                      backgroundColor: "#f0f0f0",
                                    }}
                                    onClick={() => image.imageUrl && openFullscreen(image.imageUrl)}
                                    onError={(e) => {
                                      console.error(`Failed to load image: ${image.thumbnailUrl || image.imageUrl || 'No URL provided'}`);
                                      e.target.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAMLCwgAAACH5BAAAAAAALAAAAAABAAEAAAICRAEAOw==';
                                      e.target.style.display = "block";
                                    }}
                                  />
                                  <button
                                    onClick={() => handleDownload(image.imageUrl)}
                                    style={{
                                      position: "absolute",
                                      top: "0.5rem",
                                      right: "0.5rem",
                                      backgroundColor: "#fe9a65",
                                      borderRadius: "50%",
                                      padding: "0.5rem",
                                      border: "none",
                                      cursor: "pointer",
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                      transition: "background-color 0.2s",
                                    }}
                                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#fd8c4e")}
                                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#fe9a65")}
                                  >
                                    <Download
                                      style={{
                                        height: "1.25rem",
                                        width: "1.25rem",
                                        color: "white",
                                      }}
                                    />
                                  </button>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p style={{ color: "#6b7280", fontStyle: "italic" }}>
                              No images found for this album.
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </>
            ) : (
              <div className="page-placeholder">
                <p className="placeholder-text">
                  Photo albums will be displayed here.
                </p>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Download Modal */}
      {showDownloadModal && (
        <div className="download-modal-overlay">
          <div className="download-modal">
            <div className="download-modal-header">
              <div className="download-modal-icon">
                <Download className="modal-download-icon" />
              </div>
              <h2 className="download-modal-title">Download Image</h2>
              <p className="download-modal-subtitle">Choose your preferred format</p>
              {!isDownloading && (
                <button onClick={closeDownloadModal} className="download-modal-close">
                  <X className="close-icon" />
                </button>
              )}
            </div>

            <div className="download-modal-content">
              {!isDownloading ? (
                <>
                  <div className="format-selection">
                    <h3 className="format-title">Select Format:</h3>
                    <div className="format-options">
                      <button
                        className={`format-btn ${selectedFormat === 'jpeg' ? 'format-active' : ''}`}
                        onClick={() => setSelectedFormat('jpeg')}
                      >
                        <span className="format-name">JPEG</span>
                        <span className="format-desc">Good, smaller size</span>
                      </button>
                      <button
                        className={`format-btn ${selectedFormat === 'png' ? 'format-active' : ''}`}
                        onClick={() => setSelectedFormat('png')}
                      >
                        <span className="format-name">PNG</span>
                        <span className="format-desc">High quality, larger size</span>
                      </button>
                      <button
                        className={`format-btn ${selectedFormat === 'webp' ? 'format-active' : ''}`}
                        onClick={() => setSelectedFormat('webp')}
                      >
                        <span className="format-name">WebP</span>
                        <span className="format-desc">Modern format, good compression</span>
                      </button>
                      <button
    className={`format-btn ${selectedFormat === 'heic' ? 'format-active' : ''}`}
    onClick={() => setSelectedFormat('heic')}
  >
    <span className="format-name">HEIC</span>
    <span className="format-desc">Optimized for iPhone, high quality</span>
  </button>
                    </div>
                  </div>

                  <div className="download-actions">
                    <button
                      onClick={handleSingleDownload}
                      className="download-start-btn"
                      disabled={isDownloading}
                    >
                      <Download className="btn-icon" />
                      Start Download
                    </button>
                  </div>
                </>
              ) : (
                <div className="download-progress-section">
                  <div className="progress-info">
                    <h3 className="progress-title">Downloading Image...</h3>
                  </div>

                  <div className="progress-container">
                    <div className="progress-bar">
                      <div
                        className="progress-fill"
                        style={{ width: `${downloadProgress}%` }}
                      ></div>
                    </div>
                    <span className="progress-percentage">{Math.round(downloadProgress)}%</span>
                  </div>

                  <div className="progress-status">
                    <Loader2 className="progress-spinner" />
                    <span>Please wait while we prepare your image...</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="footer">
        <div className="footer-content">
          <div className="footer-info">
            <h3 className="footer-title">Believers Community Church</h3>
            <p className="footer-subtitle">God's platform for building men</p>
          </div>
          <div className="footer-copyright">
            <p className="copyright-text">© {new Date().getFullYear()} <a href="https://wa.me/+2349110241218" className="heic-modal-link" target="_blank" rel="noopener noreferrer">BCC Media.</a> All rights reserved.</p>
          </div>
        </div>
      </footer>

      {/* Fullscreen Image Modal */}
      {fullscreenImage && (
        <div className="fullscreen-modal" onClick={closeFullscreen}>
          <button className="fullscreen-close" onClick={closeFullscreen}>
            <X className="close-icon-large" />
          </button>
          <div className="fullscreen-content" onClick={(e) => e.stopPropagation()}>
            <img
              src={fullscreenImage || 'data:image/gif;base64,R0lGODlhAQABAIAAAMLCwgAAACH5BAAAAAAALAAAAAABAAEAAAICRAEAOw=='}
              alt="Fullscreen view"
              className="fullscreen-image"
              loading="lazy"
              style={{ maxWidth: '90vw', maxHeight: '90vh', objectFit: 'contain' }}
              onError={(e) => {
                console.error(`Failed to load fullscreen image: ${fullscreenImage || 'No URL provided'}`);
                e.target.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAMLCwgAAACH5BAAAAAAALAAAAAABAAEAAAICRAEAOw==';
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default AlbumsPage;