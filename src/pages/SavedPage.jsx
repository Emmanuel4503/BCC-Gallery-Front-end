import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Heart, Download, X, Loader2, Trash2 } from "lucide-react";
import "../styles/SubPages.css";


function SavedPage() {
  const [savedImages, setSavedImages] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [userReactions, setUserReactions] = useState({});
  const [disabledButtons, setDisabledButtons] = useState(new Set());
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [downloadType, setDownloadType] = useState("single");
  const [selectedFormat, setSelectedFormat] = useState("png");
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [isDownloading, setIsDownloading] = useState(false);
  const [currentDownloadImage, setCurrentDownloadImage] = useState(null);
  const [fullscreenImage, setFullscreenImage] = useState(null);
  

  // Fetch user from localStorage
  useEffect(() => {
    const checkExistingUser = () => {
      try {
        const storedUserData = localStorage.getItem("bcc_user_data");
        if (storedUserData) {
          const userData = JSON.parse(storedUserData);
          setCurrentUser({
            id: Number(userData.userId),
            name: userData.userName,
          });
        }
      } catch (error) {
        console.error("Error checking existing user:", error);
      }
    };
    checkExistingUser();
  }, []);

  // Fetch saved images
  const fetchSavedImages = async () => {
    if (!currentUser?.id) return;
    try {
      setIsLoading(true);
      setError(null);
      const response = await fetch(
        `https://bcc-gallery-back-end-production.up.railway.app/saved/get/${currentUser.id}`
      );
      if (!response.ok) {
        throw new Error(`Failed to fetch saved images: ${response.status}`);
      }
      const data = await response.json();
      setSavedImages(data);
    } catch (error) {
      console.error("Error fetching saved images:", error);
      setError(error.message);
      setSavedImages([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch user reactions
  const fetchUserReactions = async (userId) => {
    try {
      const response = await fetch(
        `https://bcc-gallery-back-end-production.up.railway.app/images/reactions?userId=${userId}`
      );
      if (!response.ok) {
        throw new Error(`Failed to fetch user reactions: ${response.status}`);
      }
      const data = await response.json();
      const reactions = Object.entries(data).reduce((acc, [imageId, reactionType]) => {
        acc[`${imageId}_${userId}`] = reactionType;
        return acc;
      }, {});
      setUserReactions(reactions);
    } catch (error) {
      console.error("Error fetching user reactions:", error);
    }
  };

  const handleReaction = useCallback(
    async (imageId, reactionType) => {
      if (!currentUser?.id) {
        alert("Please sign in to react to images");
        return;
      }
  
      const reactionKey = `${imageId}_${currentUser.id}`;
      const currentUserReaction = userReactions[reactionKey];
  
     
      if (currentUserReaction && currentUserReaction !== reactionType) {
        alert("You have already reacted to this image.");
        return;
      }
  
      setDisabledButtons((prev) => new Set([...prev, imageId]));
  
      try {
        setUserReactions((prev) => {
          const newReactions = { ...prev };
          if (currentUserReaction === reactionType) {
            delete newReactions[reactionKey];
          } else {
            newReactions[reactionKey] = reactionType;
          }
          return newReactions;
        });
  
        const response = await fetch("\https://bcc-gallery-back-end-production.up.railway.app/images/react", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            imageId,
            reaction: currentUserReaction === reactionType ? null : reactionType,
            userId: Number(currentUser.id),
          }),
        });
  
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || `Failed to process reaction: ${response.status}`);
        }
  
        await fetchSavedImages();
        await fetchUserReactions(Number(currentUser.id));
      } catch (error) {
        console.error("Error processing reaction:", error);
        setUserReactions((prev) => {
          const newReactions = { ...prev };
          if (currentUserReaction === reactionType) {
            newReactions[reactionKey] = reactionType;
          } else {
            delete newReactions[reactionKey];
          }
          return newReactions;
        });
        alert(`Failed to process reaction: ${error.message}`);
      } finally {
        setTimeout(() => {
          setDisabledButtons((prev) => {
            const newSet = new Set(prev);
            newSet.delete(imageId);
            return newSet;
          });
        }, 200);
      }
    },
    [currentUser, userReactions]
  );
  const debounce = (func, wait) => {
    let timeoutId;
    return (...args) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => func(...args), wait);
    };
  };

  const debouncedHandleReaction = useCallback(
    debounce((imageId, reactionType) => handleReaction(imageId, reactionType), 200),
    [handleReaction]
  );

  const getReactionCount = (image, reactionType) => {
    return image?.reactions?.[reactionType] || 0;
  };

  const isUserReacted = (imageId) => {
    if (!currentUser?.id) return false;
    const reactionKey = `${imageId}_${currentUser.id}`;
    return !!userReactions[reactionKey];
  };

  // Download functionality
  const downloadImage = async (imageUrl, filename, format) => {
    try {
      let processedUrl = imageUrl;
      if (imageUrl.startsWith("/")) {
        processedUrl = `https://bcc-gallery-back-end-production.up.railway.app${imageUrl}`;
      } else if (!imageUrl.startsWith("http")) {
        processedUrl = `https://bcc-gallery-back-end-production.up.railway.app/${imageUrl}`;
      }

      const response = await fetch(processedUrl, {
        mode: "cors",
        credentials: "same-origin",
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
      }

      const blob = await response.blob();

      if (!blob.type.startsWith("image/")) {
        throw new Error("Downloaded content is not an image");
      }

      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      const img = document.createElement("img");

      return new Promise((resolve, reject) => {
        img.onload = () => {
          try {
            canvas.width = img.width;
            canvas.height = img.height;
            ctx.drawImage(img, 0, 0);

            const mimeType =
              format === "png" ? "image/png" : format === "webp" ? "image/webp" : "image/jpeg";
            const quality = format === "jpeg" ? 0.95 : undefined;

            canvas.toBlob(
              (convertedBlob) => {
                if (convertedBlob) {
                  const url = URL.createObjectURL(convertedBlob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = `${filename}.${format}`;
                  a.style.display = "none";
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                  URL.revokeObjectURL(url);
                  resolve();
                } else {
                  reject(new Error("Failed to convert image to selected format"));
                }
              },
              mimeType,
              quality
            );
          } catch (error) {
            reject(new Error(`Canvas processing failed: ${error.message}`));
          }
        };

        img.onerror = () => reject(new Error("Failed to load image for processing"));
        img.crossOrigin = "anonymous";
        img.src = URL.createObjectURL(blob);
      });
    } catch (error) {
      console.error("Download error:", error);
      throw error;
    }
  };

  const handleSingleDownload = async () => {
    if (!currentDownloadImage) {
      alert("No image selected for download");
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
        currentDownloadImage.imageUrl,
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
        alert("Image downloaded successfully!");
      }, 1000);
    } catch (error) {
      console.error("Download failed:", error);
      alert(`Failed to download image: ${error.message}`);
      setIsDownloading(false);
      setDownloadProgress(0);
    }
  };

  const handleDownloadSelected = (image) => {
    if (image) {
      setCurrentDownloadImage(image);
      setDownloadType("single");
      setShowDownloadModal(true);
    }
  };
  const handleDeleteSaved = async (imageId) => {
    if (!currentUser?.id) {
      alert("Please sign in to remove saved images");
      return;
    }
  
    // Basic validation for imageId (should be a valid MongoDB ObjectId)
    if (!imageId || typeof imageId !== "string" || !imageId.match(/^[0-9a-fA-F]{24}$/)) {
      alert("Invalid image ID");
      return;
    }
  
    try {
      const response = await fetch("https://bcc-gallery-back-end-production.up.railway.app/saved/delete", {
        method: "DELETE", // Changed from POST to DELETE
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: Number(currentUser.id),
          imageId,
        }),
      });
  
      // Check if response is JSON
      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        const text = await response.text();
        console.error("Non-JSON response:", text);
        throw new Error(`Expected JSON, received: ${text.slice(0, 50)}...`);
      }
  
      const data = await response.json();
  
      if (!response.ok) {
        throw new Error(data.message || `Failed to delete image: ${response.status}`);
      }
  
      await fetchSavedImages(); // Refresh the saved images list
      alert("Image removed from saved list!");
    } catch (error) {
      console.error("Delete error:", error);
      alert(`Failed to remove image: ${error.message}`);
    }
  };

  const openFullscreen = (imageSrc) => {
    setFullscreenImage(imageSrc);
  };

  const closeFullscreen = () => {
    setFullscreenImage(null);
  };

  const closeDownloadModal = () => {
    if (!isDownloading) {
      setShowDownloadModal(false);
      setCurrentDownloadImage(null);
      setDownloadProgress(0);
      setSelectedFormat("png");
    }
  };

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === "Escape") {
        closeFullscreen();
        if (!isDownloading) {
          closeDownloadModal();
        }
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
  }, [fullscreenImage, showDownloadModal, isDownloading]);


  useEffect(() => {
    if (currentUser?.id) {
      fetchSavedImages();
      fetchUserReactions(currentUser.id);
    }
  }, [currentUser?.id]);

  return (
    <div className="page-container">
      {/* Header */}
      <header className="page-header">
        <div className="page-header-content">
          <Link to="/" className="back-button">
            <ArrowLeft className="back-icon" />
          </Link>
          <h1 className="page-title">Saved</h1>
        </div>
      </header>

      {/* Main Content */}
      <main className="page-main">
        <div className="page-center">
          <div className="page-icon-container">
            <Heart className="page-icon" />
          </div>
          <h2 className="page-heading">Saved Photos</h2>
          <p className="page-description">
            Your saved memories and favorite photos. Keep the moments that touch your heart
            close and easily accessible.
          </p>
           <br />
          <hr />
          <p style={{ color: "#6b7280", marginBottom: "1rem" }}>
  Found {galleryImages.length} image{galleryImages.length !== 1 ? "s" : ""}
</p>

          {isLoading ? (
            <div className="loading-container">
              <div className="placeholder-loading">
                <Loader2 className="loading-spinner" />
              <p >Loading saved images...</p>
              </div>
              
            </div>
          ) : error ? (
            <div className="error-container">
              <p className="placeholder-text">Error loading saved images: {error} 
                <button onClick={fetchSavedImages} className="retry-btn">
                Retry
              </button>
              </p>
            
            </div>
          ) : savedImages.length === 0 ? (
            <div className="page-placeholder">
              <p className="placeholder-t">
                Your saved photos will appear here. Start saving your favorite!
              </p>
            </div>
          ) : (
            <div className="image-gallery">
              {savedImages.filter(image => image && image.imageUrl).map((image, index) => (
                <div key={image._id || index} className="image-card">
                  <div className="image-container">
                    <img
                      src={image.imageUrl || "/placeholder.svg"}
                      alt={`Saved image ${index + 1}`}
                      className="gallery-image"
                      onClick={() => openFullscreen(image.imageUrl)}
                    />
                  </div>
                  <div className="reaction-section">
  <button
    className={`reaction-btn ${userReactions[`${image._id}_${currentUser?.id}`] === "partyPopper" ? "reaction-active" : ""}`}
    title="Reactions are view-only on this page"
    disabled
  >
    🎉 <span className="reaction-count">{getReactionCount(image, "partyPopper")}</span>
  </button>
  <button
    className={`reaction-btn ${userReactions[`${image._id}_${currentUser?.id}`] === "thumbsUp" ? "reaction-active" : ""}`}
    title="Reactions are view-only on this page"
    disabled
  >
    👍 <span className="reaction-count">{getReactionCount(image, "thumbsUp")}</span>
  </button>
  <button
    className={`reaction-btn ${userReactions[`${image._id}_${currentUser?.id}`] === "redHeart" ? "reaction-active" : ""}`}
    title="Reactions are view-only on this page"
    disabled
  >
    ❤️ <span className="reaction-count">{getReactionCount(image, "redHeart")}</span>
  </button>
  <button
    className={`reaction-btn ${userReactions[`${image._id}_${currentUser?.id}`] === "fire" ? "reaction-active" : ""}`}
    title="Reactions are view-only on this page"
    disabled
  >
    🔥 <span className="reaction-count">{getReactionCount(image, "fire")}</span>
  </button>
</div>
                  <div className="image-actions">
                    <button
                      onClick={() => handleDownloadSelected(image)}
                      className="image-btn download-btn"
                      title="Download"
                    >
                      <Download className="image-btn-icon" />
                    </button>
                    <button
    onClick={() => handleDeleteSaved(image._id)}
    className="image-btn delete-btn"
    title="Remove from Saved"
  >
    <Trash2 className="image-btn-icon" />
  </button>
                  </div>
                </div>
              ))}
            </div>
          )}
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
                        className={`format-btn ${selectedFormat === "jpeg" ? "format-active" : ""}`}
                        onClick={() => setSelectedFormat("jpeg")}
                      >
                        <span className="format-name">JPEG</span>
                        <span className="format-desc">Good, smaller size</span>
                      </button>
                      <button
                        className={`format-btn ${selectedFormat === "png" ? "format-active" : ""}`}
                        onClick={() => setSelectedFormat("png")}
                      >
                        <span className="format-name">PNG</span>
                        <span className="format-desc">High quality, larger size</span>
                      </button>
                      <button
                        className={`format-btn ${selectedFormat === "webp" ? "format-active" : ""}`}
                        onClick={() => setSelectedFormat("webp")}
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
  {/* Footer */}
                <footer className="footer">
                <div className="footer-content">
                    <div className="footer-info">
                    <h3 className="footer-title">Believers Community Church</h3>
                    <p className="footer-subtitle">God's platfrom for building men</p>
                    </div>
                    <div className="footer-copyright">
                    <p className="copyright-text">© {new Date().getFullYear()} <a href="https://wa.me/+2349110241218" className="heic-modal-link" target="_blank" rel="noopener noreferrer">BCC Media.</a> All rights reserved.</p>
                    </div>
                </div>
                </footer>

      {/* Fullscreen Modal */}
      {fullscreenImage && (
        <div className="fullscreen-modal" onClick={closeFullscreen}>
          <button className="fullscreen-close" onClick={closeFullscreen}>
            <X className="close-icon-large" />
          </button>
          <div className="fullscreen-content" onClick={(e) => e.stopPropagation()}>
            <img
              src={fullscreenImage || "/placeholder.svg"}
              alt="Fullscreen view"
              className="fullscreen-image"
            />
          </div>
        </div>
      )}
    </div>
  );
}




export default SavedPage;