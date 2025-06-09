import { Link } from "react-router-dom";
import { ArrowLeft, ImageIcon, ChevronDown, Download, X, Loader2 } from "lucide-react";
import { useState, useEffect, useCallback, useMemo, memo } from "react";
import "../styles/SubPages.css";

// Debounce utility
const debounce = (func, wait) => {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), wait);
  };
};

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
  const [imageLoadingStates, setImageLoadingStates] = useState({});

  // Split title into event name and date
  const splitTitle = useCallback((title) => {
    const match = title?.match(/^(.*?)\s*(\(.*\))$/);
    return match ? [match[1].trim(), match[2]] : [title || '', ''];
  }, []);

  // Fetch all albums
  const fetchAlbums = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch("https://bcc-gallery-back-end.onrender.com/album/get", {
        mode: 'cors',
        credentials: 'omit',
      });
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      const data = await response.json();
      const validAlbums = data
        .filter((album) => album && (album.title || album._id))
        .map((album, index) => ({
          ...album,
          displayName: album.title || album._id || `Album ${index + 1}`,
        }));
      setAlbums(validAlbums);
      setError(null);
    } catch (error) {
      setError("Failed to load albums. Please try again later.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAlbums();
  }, [fetchAlbums]);

  // Fetch album images
  const fetchAlbumImages = useCallback(async (albumTitle, retries = 3) => {
    if (!albumTitle || typeof albumTitle !== 'string') {
      setImageErrors((prev) => ({ ...prev, [albumTitle]: "Invalid album title" }));
      setImageLoadingStates((prev) => ({ ...prev, [albumTitle]: false }));
      return;
    }

    setImageLoadingStates((prev) => ({ ...prev, [albumTitle]: true }));

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const response = await fetch(`https://bcc-gallery-back-end.onrender.com/images/album/${encodeURIComponent(albumTitle)}`, {
          mode: 'cors',
          credentials: 'omit',
        });

        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const data = await response.json();
        if (!Array.isArray(data)) {
          throw new Error('Invalid response: Expected an array of images');
        }

        const processedData = data.slice(0, 20).map((image, index) => ({
          ...image,
          thumbnailUrl: image.thumbnailUrl || image.imageUrl,
          imageUrl: image.imageUrl || image.thumbnailUrl,
          _id: image._id || `image-${index}`,
        }));

        setAlbumImages((prev) => ({ ...prev, [albumTitle]: processedData }));
        setImageErrors((prev) => ({ ...prev, [albumTitle]: null }));
        setImageLoadingStates((prev) => ({ ...prev, [albumTitle]: false }));
        return;
      } catch (error) {
        if (attempt === retries) {
          setImageErrors((prev) => ({ ...prev, [albumTitle]: `Failed to load images: ${error.message}` }));
          setImageLoadingStates((prev) => ({ ...prev, [albumTitle]: false }));
        }
        await new Promise((resolve) => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      }
    }
  }, []);

  // Debounced toggle album
  const debouncedToggleAlbum = useMemo(
    () => debounce((albumTitle) => {
      if (openAlbum === albumTitle) {
        setOpenAlbum(null);
      } else {
        setOpenAlbum(albumTitle);
        if (!albumImages[albumTitle] && !imageErrors[albumTitle] && !imageLoadingStates[albumTitle]) {
          fetchAlbumImages(albumTitle);
        }
      }
    }, 200),
    [openAlbum, albumImages, imageErrors, imageLoadingStates, fetchAlbumImages]
  );

  const toggleAlbum = useCallback((albumTitle) => {
    debouncedToggleAlbum(albumTitle);
  }, [debouncedToggleAlbum]);

  // Preload image
  const preloadImage = useCallback((imageUrl) => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = imageUrl;
    });
  }, []);

  // Open fullscreen
  const openFullscreen = useCallback(async (imageUrl) => {
    try {
      await preloadImage(imageUrl);
      setFullscreenImage(imageUrl);
    } catch {
      setFullscreenImage(imageUrl);
    }
  }, [preloadImage]);

  const closeFullscreen = useCallback(() => {
    setFullscreenImage(null);
  }, []);

  // Download image
  const downloadImage = useCallback(async (imageUrl, filename, format) => {
    try {
      let processedUrl = imageUrl;
      if (!imageUrl.startsWith('http')) {
        processedUrl = `https://bcc-gallery-back-end.onrender.com${imageUrl.startsWith('/') ? imageUrl : `/${imageUrl}`}`;
      }

      const response = await fetch(processedUrl, { mode: 'cors', credentials: 'omit' });
      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.status}`);
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
          canvas.width = img.width;
          canvas.height = img.height;
          ctx.drawImage(img, 0, 0);

          const mimeType = format === 'png' ? 'image/png' : format === 'webp' ? 'image/webp' : 'image/jpeg';
          const quality = format === 'jpeg' ? 0.95 : undefined;

          canvas.toBlob(
            (convertedBlob) => {
              if (convertedBlob) {
                const url = URL.createObjectURL(convertedBlob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${filename}.${format}`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                resolve();
              } else {
                reject(new Error('Failed to convert image'));
              }
            },
            mimeType,
            quality
          );
        };

        img.onerror = () => reject(new Error('Failed to load image for processing'));
        img.crossOrigin = 'anonymous';
        img.src = URL.createObjectURL(blob);
      });
    } catch (error) {
      throw error;
    }
  }, []);

  // Handle download
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

  // Handle Escape key
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
  const ImageThumbnail = memo(({ image, index, albumTitle, onFullscreen, onDownload }) => {
    const [imageLoaded, setImageLoaded] = useState(false);
    const [imageError, setImageError] = useState(false);

    useEffect(() => {
      let timeoutId;
      if (!imageLoaded && !imageError) {
        timeoutId = setTimeout(() => {
          setImageError(true);
          setImageLoaded(true);
        }, 10000);
      }
      return () => clearTimeout(timeoutId);
    }, [imageLoaded, imageError]);

    return (
      <div style={{ position: 'relative' }}>
        {!imageLoaded && !imageError && (
          <div style={{
            width: "100%",
            height: "150px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "#f3f4f6"
          }}>
            <Loader2 className="animate-spin" style={{ width: "2rem", height: "2rem", color: "gray" }} />
          </div>
        )}
        {imageError && (
          <div style={{
            width: "100%",
            height: "150px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "#f0f0f0",
            color: "#b91c1c",
            fontSize: "0.9rem",
            textAlign: "center"
          }}>
            Failed to load image
          </div>
        )}
        <img
          src={image.thumbnailUrl}
          alt={`Image ${index + 1}`}
          style={{
            width: "100%",
            height: "150px",
            objectFit: "cover",
            display: imageLoaded && !imageError ? "block" : "none",
            cursor: "pointer"
          }}
          loading="lazy"
          onClick={() => !imageError && onFullscreen(image.imageUrl)}
          onLoad={() => {
            setImageLoaded(true);
            setImageError(false);
          }}
          onError={() => {
            setImageError(true);
            setImageLoaded(true);
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
              bottom: "10px",
              right: "10px",
              backgroundColor: "#fe9a65",
              borderRadius: "50%",
              padding: "10px",
              border: "none",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#fd8c4e")}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#fe9a65")}
          >
            <Download style={{ height: "1.25rem", width: "1.25rem", color: "white" }} />
          </button>
        )}
      </div>
    );
  });

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
          <hr />
          <div className="albums-container" style={{ marginTop: "2rem" }}>
            {isLoading ? (
              <div className="page-placeholder">
                <p className="page-text">Loading albums...</p>
              </div>
            ) : error ? (
              <div className="page-placeholder">
                <p className="page-text" style={{ color: "#b91c1c" }}>{error}</p>
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
                            backgroundColor: "white",
                            borderRadius: "0.5rem",
                            marginTop: "0.5rem",
                            boxShadow: "0 2px 4px rgba(0,0,0,0.06)",
                          }}
                        >
                          {imageErrors[album.displayName] ? (
                            <p style={{ color: "#b91c1c", fontStyle: "italic" }}>
                              {imageErrors[album.displayName]}
                            </p>
                          ) : imageLoadingStates[album.displayName] ? (
                            <div style={{ 
                              display: "flex", 
                              alignItems: "center", 
                              justifyContent: "center", 
                              padding: "2rem",
                              color: "#6b7280" 
                            }}>
                              <Loader2 className="animate-spin" style={{ width: "2rem", height: "2rem", marginRight: "0.5rem" }} />
                              Loading images...
                            </div>
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
                                  key={`image-${album.displayName}-${image._id}`}
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
                <p className="page-text">Photo albums will be displayed here.</p>
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
              src={fullscreenImage}
              alt="Fullscreen view"
              style={{ maxWidth: '90vw', maxHeight: '90vh', objectFit: 'contain' }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default AlbumsPage;