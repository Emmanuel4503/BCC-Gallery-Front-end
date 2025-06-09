import { Link } from "react-router-dom";
import { ArrowLeft, ImageIcon, ChevronDown, Download, X, Loader2 } from "lucide-react";
import { useState, useEffect, useCallback, useMemo } from "react";
import "../styles/SubPages.css";

function AlbumsPage() {
  const [albums, setAlbums] = useState([]);
  const [albumImages, setAlbumImages] = useState({});
  const [openAlbum, setOpenAlbum] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [imageErrors, setImageErrors] = useState({});
  const [fullscreenImage, setFullscreenImage] = useState(null);
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [selectedFormat, setSelectedFormat] = useState('png');
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [currentDownloadImage, setCurrentDownloadImage] = useState(null);

  // Split title into event name and date
  const splitTitle = (title) => {
    const match = title.match(/^(.*?)\s*(\(.*\))$/);
    if (match) {
      return [match[1].trim(), match[2]];
    }
    return [title, ""];
  };

  // Fetch all albums
  useEffect(() => {
    setIsLoading(true);
    fetch("https://bcc-gallery-back-end.onrender.com/album/get")
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }
        return response.json();
      })
      .then((data) => {
        const validAlbums = data
          .filter((album) => album && (album.title || album._id))
          .map((album, index) => ({
            ...album,
            displayName: album.title || album._id || `Album ${index + 1}`,
          }));
        setAlbums(validAlbums);
        setIsLoading(false);
      })
      .catch((error) => {
        console.error("Error fetching albums:", error);
        setError("Failed to load albums. Please try again later.");
        setIsLoading(false);
      });
  }, []);

  // Fetch album images
  const fetchAlbumImages = useCallback(async (albumTitle, retries = 3) => {
    if (!albumTitle || typeof albumTitle !== 'string') {
      console.error(`Invalid album title: ${albumTitle}`);
      setImageErrors((prev) => ({ ...prev, [albumTitle]: "Invalid album title" }));
      return;
    }

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        console.log(`Fetching images for album: ${albumTitle}, attempt ${attempt}`);
        const response = await fetch(`https://bcc-gallery-back-end.onrender.com/images/album/${encodeURIComponent(albumTitle)}`, {
          mode: 'cors',
          credentials: 'omit',
        });

        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        console.log(`Received ${data.length} images for album: ${albumTitle}`);

        if (!Array.isArray(data)) {
          throw new Error('Invalid response: Expected an array of images');
        }

        const processedData = data.slice(0, 20).map((image) => {
          let imageUrl = image.imageUrl || image.thumbnailUrl;
          if (imageUrl && !imageUrl.startsWith('http')) {
            imageUrl = `https://bcc-gallery-back-end.onrender.com${imageUrl.startsWith('/') ? imageUrl : `/${imageUrl}`}`;
          }
          return { ...image, imageUrl: imageUrl || 'data:image/gif;base64,R0lGODlhAQABAIAAAMLCwgAAACH5BAAAAAAALAAAAAABAAEAAAICRAEAOw==' };
        });

        setAlbumImages((prev) => ({ ...prev, [albumTitle]: processedData }));
        setImageErrors((prev) => ({ ...prev, [albumTitle]: null }));
        return;
      } catch (error) {
        console.error(`Attempt ${attempt} failed for album ${albumTitle}:`, error.message);
        if (attempt === retries) {
          setImageErrors((prev) => ({ ...prev, [albumTitle]: `Failed to load images after ${retries} attempts: ${error.message}` }));
        }
        await new Promise((resolve) => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      }
    }
  }, []);

  // Toggle album dropdown
  const toggleAlbum = useCallback((albumTitle) => {
    if (openAlbum === albumTitle) {
      setOpenAlbum(null);
    } else {
      setOpenAlbum(albumTitle);
      if (!albumImages[albumTitle] && !imageErrors[albumTitle]) {
        fetchAlbumImages(albumTitle);
      }
    }
  }, [openAlbum, albumImages, imageErrors, fetchAlbumImages]);

  // Preload image for better performance
  const preloadImage = useCallback((imageUrl) => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = imageUrl;
    });
  }, []);

  // Optimized fullscreen image opening with preloading
  const openFullscreen = useCallback(async (imageUrl) => {
    try {
      await preloadImage(imageUrl);
      setFullscreenImage(imageUrl);
    } catch (error) {
      console.error(`Failed to preload image: ${imageUrl}`, error);
      setFullscreenImage(imageUrl);
    }
  }, [preloadImage]);

  const closeFullscreen = useCallback(() => {
    setFullscreenImage(null);
  }, []);

  // Download image function
  const downloadImage = useCallback(async (imageUrl, filename, format) => {
    try {
      let processedUrl = imageUrl;
      if (!imageUrl.startsWith('http')) {
        processedUrl = `https://bcc-gallery-back-end.onrender.com${imageUrl.startsWith('/') ? imageUrl : `/${imageUrl}`}`;
      }

      const response = await fetch(processedUrl, {
        mode: 'cors',
        credentials: 'omit',
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
  }, []);

  // Handle image download
  const handleDownload = useCallback((imageUrl) => {
    setCurrentDownloadImage(imageUrl);
    setShowDownloadModal(true);
  }, []);

  const handleSingleDownload = useCallback(async () => {
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
  }, [currentDownloadImage, selectedFormat, downloadImage]);

  const closeDownloadModal = useCallback(() => {
    if (!isDownloading) {
      setShowDownloadModal(false);
      setCurrentDownloadImage(null);
      setDownloadProgress(0);
      setSelectedFormat('png');
    }
  }, [isDownloading]);

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
  }, [fullscreenImage, showDownloadModal, closeFullscreen, closeDownloadModal]);

  // ImageThumbnail component
  const ImageThumbnail = ({ image, index, albumTitle, onFullscreen, onDownload }) => {
    const [imageLoaded, setImageLoaded] = useState(false);
    const [imageError, setImageError] = useState(false);

    return (
      <div>
        {!imageLoaded && (
          <div style={{
            width: "100%",
            height: "150px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "#f3f4f6"
          }}>
            <Loader2 style={{ width: "2rem", height: "2rem", color: "#9ca3af" }} className="animate-spin" />
          </div>
        )}
        <img
          src={image.imageUrl || 'data:image/gif;base64,R0lGODlhAQABAIAAAMLCwgAAACH5BAAAAAAALAAAAAABAAEAAAICRAEAOw=='}
          alt={`Image ${index + 1}`}
          loading="lazy"
          style={{
            width: "100%",
            height: "150px",
            objectFit: "cover",
            display: imageLoaded ? "block" : "none",
            cursor: "pointer",
            backgroundColor: "#f0f0f0",
          }}
          onClick={() => !imageError && onFullscreen(image.imageUrl)}
          onLoad={() => {
            setImageLoaded(true);
            setImageError(false);
          }}
          onError={(e) => {
            console.error(`Failed to load image: ${image.imageUrl || 'No URL provided'}`);
            setImageError(true);
            setImageLoaded(true);
            e.target.src = "data:image/gif;base64,R0lGODlhAQABAIAAAMLCwgAAACH5BAAAAAAALAAAAAABAAEAAAICRAEAOw==";
          }}
        />
        {imageLoaded && !imageError && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDownload(image.imageUrl);
            }}
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
        )}
      </div>
    );
  };

  return (
    <div className="page-container">
      <header className="page-header">
        <div className="page-header-content">
          <Link to="/" className="back-button">
            <ArrowLeft className="back-icon" />
          </Link>
          <h1 className="page-title">Albums</h1>
        </div>
      </header>

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
                <p className="placeholder-text">Loading albums...</p>
              </div>
            ) : error ? (
              <div className="page-placeholder">
                <p className="placeholder-text" style={{ color: "#b91c1c" }}>
                  {error}
                </p>
              </div>
            ) : albums.length > 0 ? (
              <>
                <p style={{ color: "#6b7280", marginBottom: "1rem" }}>
                  Found {albums.length} album{albums.length !== 1 ? "s" : ""}
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
                          {imageErrors[album.displayName] ? (
                            <p style={{ color: "#b91c1c", fontStyle: "italic" }}>
                              {imageErrors[album.displayName]}
                            </p>
                          ) : albumImages[album.displayName]?.length > 0 ? (
                            <div
                              style={{
                                display: "grid",
                                gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
                                gap: "1rem",
                              }}
                            >
                              {albumImages[album.displayName].slice(0, 20).map((image, index) => (
                                useMemo(() => (
                                  <div
                                    key={`image-${album.displayName}-${image._id || index}`}
                                    style={{
                                      position: "relative",
                                      overflow: "hidden",
                                      borderRadius: "0.5rem",
                                      backgroundColor: "#f0f0f0",
                                    }}
                                  >
                                    <ImageThumbnail
                                      image={image}
                                      index={index}
                                      albumTitle={album.displayName}
                                      onFullscreen={openFullscreen}
                                      onDownload={handleDownload}
                                    />
                                  </div>
                                ), [image, index, album.displayName, openFullscreen, handleDownload])
                              ))}
                            </div>
                          ) : (
                            <p style={{ color: "#6b7280", fontStyle: "italic" }}>
                              {albumImages[album.displayName] ? "No images found for this album." : "Loading images..."}
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

      <footer className="footer">
        <div className="footer-content">
          <div className="footer-info">
            <h3 className="footer-title">Believers Community Church</h3>
            <p className="footer-subtitle">God's platform for building men</p>
          </div>
          <div className="footer-copyright">
            <p className="copyright-text">© {new Date().getFullYear()} BCC Media. All rights reserved.</p>
          </div>
        </div>
      </footer>

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