        import { useState, useEffect, useCallback } from "react"
        import { Menu, X, Image, Heart, Bell, Download, Save, User, Loader2 } from "lucide-react"
        import { Link } from "react-router-dom"
        import "../styles/HomePage.css"
        import bcclogo from './bcclogo.png';

        function HomePage() {
        const [isMenuOpen, setIsMenuOpen] = useState(false)
        const [currentSlide, setCurrentSlide] = useState(0)
        const [selectedImages, setSelectedImages] = useState([])
        const [fullscreenImage, setFullscreenImage] = useState(null)
        const [userReactions, setUserReactions] = useState({}) 
        const [disabledButtons, setDisabledButtons] = useState(new Set())
        const [showUserModal, setShowUserModal] = useState(false)
        const [userName, setUserName] = useState('')
        const [isSubmitting, setIsSubmitting] = useState(false)
        const [currentUser, setCurrentUser] = useState(null)
        const [carouselImages, setCarouselImages] = useState([])
        const [galleryImages, setGalleryImages] = useState([])
        const [isLoadingCarousel, setIsLoadingCarousel] = useState(true)
        const [isLoadingGallery, setIsLoadingGallery] = useState(true)
        const [carouselError, setCarouselError] = useState(null)
        const [galleryError, setGalleryError] = useState(null)
        const [showDownloadModal, setShowDownloadModal] = useState(false)
        const [downloadType, setDownloadType] = useState('') 
        const [selectedFormat, setSelectedFormat] = useState('png');
        const [downloadProgress, setDownloadProgress] = useState(0)
        const [isDownloading, setIsDownloading] = useState(false)
        const [currentDownloadImage, setCurrentDownloadImage] = useState(null)

        const [latestAlbumTitle, setLatestAlbumTitle] = useState(null);
     const [isLoadingAlbum, setIsLoadingAlbum] = useState(true);
    const [albumError, setAlbumError] = useState(null);

    const [isTransitioning, setIsTransitioning] = useState(false)

        // Fetch carousel images
        const fetchCarouselImages = async () => {
            try {
            setIsLoadingCarousel(true)
            setCarouselError(null)
            
            const response = await fetch('https://bcc-gallery-back-end.onrender.com/images/selected')
            
            if (!response.ok) {
                throw new Error(`Failed to fetch carousel images: ${response.status}`)
            }
            
            const data = await response.json()
            console.log('Carousel images fetched:', data)
            
    
            setCarouselImages(data)
            } catch (error) {
            console.error('Error fetching carousel images:', error)
            setCarouselError(error.message)
            
            setCarouselImages([])
            } finally {
            setIsLoadingCarousel(false)
            }
        }

        // Fetch gallery images 
const fetchGalleryImages = async (silent = false) => {
    try {
        if (!silent) {
            setIsLoadingGallery(true)
        }
        setGalleryError(null)
        
        const response = await fetch('https://bcc-gallery-back-end.onrender.com/images/latest')
        
        if (!response.ok) {
            throw new Error(`Failed to fetch gallery images: ${response.status}`)
        }
        
        const data = await response.json()
        console.log('Gallery images fetched:', data)
        
        
        setGalleryImages(data)
    } catch (error) {
        console.error('Error fetching gallery images:', error)
        setGalleryError(error.message)
    
        setGalleryImages([])
    } finally {
        if (!silent) {
            setIsLoadingGallery(false)
        }
    }
}

            // Fetch user reactions from backend
        const fetchUserReactions = async (userId) => {
            try {
            const response = await fetch(`https://bcc-gallery-back-end.onrender.com/images/reactions?userId=${userId}`);
            if (!response.ok) {
                throw new Error(`Failed to fetch user reactions: ${response.status}`);
            }
            const data = await response.json();
            console.log('User reactions fetched:', data);
            const reactions = Object.entries(data).reduce((acc, [imageId, reactionType]) => {
                acc[`${imageId}_${userId}`] = reactionType;
                return acc;
            }, {});
            setUserReactions(reactions);
            } catch (error) {
            console.error('Error fetching user reactions:', error);
            }
        };

        const fetchLatestAlbum = async () => {
            try {
                setIsLoadingAlbum(true);
                setAlbumError(null);
                const response = await fetch('https://bcc-gallery-back-end.onrender.com/album/latest');
                if (!response.ok) {
                    throw new Error(`Failed to fetch latest album: ${response.status}`);
                }
                const data = await response.json();
                setLatestAlbumTitle(data?.title || null);
            } catch (error) {
                console.error('Error fetching latest album:', error);
                setAlbumError(error.message);
                setLatestAlbumTitle(null);
            } finally {
                setIsLoadingAlbum(false);
            }
        };

        const handleReaction = useCallback(
            async (imageId, reactionType) => {
              if (!currentUser?.id) {
                alert('Please sign in to react to images');
                return;
              }
          
              const reactionKey = `${imageId}_${currentUser.id}`;
              const buttonKey = `${imageId}_${reactionType}`;
              const currentUserReaction = userReactions[reactionKey];
              setDisabledButtons((prev) => new Set([...prev, buttonKey]));
          
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
          
                // Send reaction to backend
                const response = await fetch('https://bcc-gallery-back-end.onrender.com/images/react', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    imageId: imageId,
                    reaction: reactionType,
                    userId: Number(currentUser.id),
                  }),
                });
          
                if (!response.ok) {
                  const errorData = await response.json();
                  throw new Error(errorData.error || `Failed to process reaction: ${response.status}`);
                }
          
                // Re-fetch gallery images 
                await fetchGalleryImages(true);
          
               
                await fetchUserReactions(Number(currentUser.id));
              } catch (error) {
                console.error('Error processing reaction:', error);
          
               
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
                    newSet.delete(buttonKey);
                    return newSet;
                  });
                }, 200); 
              }
            },
            [currentUser, userReactions, fetchGalleryImages, fetchUserReactions]
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
            return image?.reactions?.[reactionType] || 0
        }
        
        const isUserReacted = (imageId, reactionType) => {
            if (!currentUser?.id) return false
            const reactionKey = `${imageId}_${currentUser.id}`
            return userReactions[reactionKey] === reactionType
        }

        // Download functionality
        const downloadImage = async (imageUrl, filename, format) => {
            try {
              console.log('Downloading image:', { imageUrl, filename, format });
          
              // Validate imageUrl
              if (!imageUrl || typeof imageUrl !== 'string') {
                throw new Error('Invalid image URL provided');
              }
          
              // Use imageUrl directly if it starts with http(s), otherwise construct Cloudinary URL
              let processedUrl = imageUrl;
              if (!imageUrl.startsWith('http')) {
                processedUrl = `https://res.cloudinary.com/dqxhczhxk/image/upload/${imageUrl}`;
              }
          
              console.log('Fetching image from:', processedUrl);
          
              const response = await fetch(processedUrl, {
                mode: 'cors',
                credentials: 'same-origin',
              });
          
              if (!response.ok) {
                const text = await response.text();
                throw new Error(`Failed to fetch image: ${response.status} ${response.statusText} - ${text.slice(0, 100)}`);
              }
          
              const blob = await response.blob();
              if (!blob.type.startsWith('image/')) {
                throw new Error(`Downloaded content is not an image: ${blob.type}`);
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
              console.error('Download error:', {
                message: error.message,
                stack: error.stack,
                imageUrl,
                filename,
                format
              });
              throw error;
            }
          };

          const handleSingleDownload = async () => {
            if (!currentDownloadImage) {
              alert('No image selected for download');
              return;
            }
          
            setIsDownloading(true);
            setDownloadProgress(0);
          
            try {
              console.log('Starting single download:', currentDownloadImage);
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
                alert('Image downloaded successfully!');
              }, 1000);
            } catch (error) {
              console.error('Single download failed:', {
                message: error.message,
                image: currentDownloadImage,
              });
              alert(`Failed to download image: ${error.message}`);
              setIsDownloading(false);
              setDownloadProgress(0);
            }
          };

          const handleMultipleDownload = async () => {
            if (selectedImages.length === 0) {
              alert('Please select at least one image to download');
              return;
            }
          
            console.log('Starting multiple download:', { selectedImages, galleryImages });
          
            setIsDownloading(true);
            setDownloadProgress(0);
          
            try {
              const totalImages = selectedImages.length;
              let successCount = 0;
              let failCount = 0;
          
              for (let i = 0; i < totalImages; i++) {
                const imageIndex = selectedImages[i];
                const image = galleryImages[imageIndex];
          
                console.log(`Processing image at index ${imageIndex}:`, image);
          
                if (image && image.imageUrl) {
                  try {
                    const randomNumber = Math.floor(1000 + Math.random() * 9000);
                    await downloadImage(
                      image.imageUrl,
                      `BCC-image-${imageIndex + 1}-${randomNumber}-${Date.now()}`,
                      selectedFormat
                    );
                    successCount++;
                    console.log(`Successfully downloaded image at index ${imageIndex}`);
                  } catch (error) {
                    console.error(`Failed to download image at index ${imageIndex}:`, error);
                    failCount++;
                  }
                } else {
                  console.error(`No valid image found at index ${imageIndex}`);
                  failCount++;
                }
          
                setDownloadProgress(((i + 1) / totalImages) * 100);
          
                await new Promise((resolve) => setTimeout(resolve, 1000));
              }
          
              console.log(`Download completed: ${successCount} succeeded, ${failCount} failed`);
          
              setTimeout(() => {
                setShowDownloadModal(false);
                setIsDownloading(false);
                setDownloadProgress(0);
                setSelectedImages([]);
          
                if (failCount > 0) {
                  alert(`Download completed with issues. ${successCount} images downloaded successfully, ${failCount} failed.`);
                } else {
                  alert(`All ${successCount} images downloaded successfully!`);
                }
              }, 1000);
            } catch (error) {
              console.error('Bulk download failed:', error);
              alert(`Failed to download images: ${error.message}`);
              setIsDownloading(false);
              setDownloadProgress(0);
            }
          };

        useEffect(() => {
            fetchCarouselImages();
            fetchGalleryImages();
            fetchLatestAlbum();
            if (currentUser?.id) {
            fetchUserReactions(currentUser.id);
            }
        }, [currentUser?.id]);
    
            useEffect(() => {
                const checkExistingUser = () => {
                try {
                    const storedUserData = localStorage.getItem('bcc_user_data');
                    
                    if (storedUserData) {
                    const userData = JSON.parse(storedUserData);
                    setCurrentUser({ 
                        id: Number(userData.userId), 
                        name: userData.userName 
                    });
                    console.log('Found existing user:', userData);
                    setShowUserModal(false);
                    fetchUserReactions(Number(userData.userId));
                    } else {
                    setShowUserModal(true);
                    }
                } catch (error) {
                    console.error('Error checking existing user:', error);
                    setShowUserModal(true);
                }
                };
                
                checkExistingUser();
            }, []);

        // Handle user signup
        const handleUserSignup = async (e) => {
            if (e) e.preventDefault()
            
            if (!userName.trim()) {
            alert('Please enter your full name')
            return
            }
        
            setIsSubmitting(true)
            
            try {
            console.log('Attempting to create user:', userName.trim())
            
            const response = await fetch('https://bcc-gallery-back-end.onrender.com/users/signup', {
                method: 'POST',
                headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                },
                body: JSON.stringify({ name: userName.trim() }),
            })
        
            console.log('Response status:', response.status)
            
            const contentType = response.headers.get('content-type')
            if (!contentType || !contentType.includes('application/json')) {
                throw new Error('Server returned non-JSON response')
            }
        
            const data = await response.json()
            console.log('Response data:', data)
        
            if (!response.ok) {
                throw new Error(data.error || `Server error: ${response.status}`)
            }
        
            // Store user data in localStorage
                    const userData = { 
                        userId: Number(data.userId || data.user._id),
                        userName: data.user.name 
                    };
                    localStorage.setItem('bcc_user_data', JSON.stringify(userData));
                    
                    setCurrentUser({ 
                        id: Number(data.userId || data.user._id), 
                        name: data.user.name 
                    });
                    setShowUserModal(false);
                    setUserName('');
                    fetchUserReactions(Number(data.userId || data.user._id));
                    
                    console.log('User created successfully:', userData);
            } catch (error) {
            console.error('Signup error:', error)
            
            if (error.message.includes('Failed to fetch')) {
                alert('Cannot connect to server. Please check if the server is running on https://bcc-gallery-back-end.onrender.com')
            } else if (error.message.includes('non-JSON response')) {
                alert('Server error: Invalid response format')
            } else {
                alert(`Failed to create account: ${error.message}`)
            }
            } finally {
            setIsSubmitting(false)
            }
        }

        // Auto-slide
        useEffect(() => {
            if (carouselImages.length === 0) return
            
            const timer = setInterval(() => {
              setIsTransitioning(true)
              setTimeout(() => {
                setCurrentSlide((prev) => (prev + 1) % carouselImages.length)
                setIsTransitioning(false)
              }, 100)
            }, 4000)
          
            return () => clearInterval(timer)
          }, [carouselImages.length])

        const toggleMenu = () => {
            setIsMenuOpen(!isMenuOpen)
        }

        const handleImageSelect = (index) => {
            setSelectedImages((prev) => (prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]))
        }

        const handleDownloadAll = () => {
            if (selectedImages.length === 0) {
            alert('Please select at least one image by checking the checkboxes before downloading');
            return;
            }
          
            setDownloadType('multiple');
            setShowDownloadModal(true);
        }

        const handleSaveAll = async () => {
            if (!currentUser?.id) {
                alert('Please sign in to save images')
                return
            }
        
            if (selectedImages.length === 0) {
                alert('Please select at least one image to save')
                return
            }
        
            setIsSubmitting(true)
            let successCount = 0
            let failCount = 0
        
            try {
                for (const index of selectedImages) {
                    const image = galleryImages[index]
                    if (!image?._id) {
                        failCount++
                        continue
                    }
        
                    try {
                        const response = await fetch('https://bcc-gallery-back-end.onrender.com/saved/add', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({
                                userId: Number(currentUser.id),
                                imageId: image._id
                            })
                        })
        
                        const data = await response.json()
                        if (!response.ok) {
                            throw new Error(data.message || 'Failed to save image')
                        }
                        successCount++
                    } catch (error) {
                        console.error(`Failed to save image ${index}:`, error)
                        failCount++
                    }
        
                    await new Promise(resolve => setTimeout(resolve, 300))
                }
        
                alert(`Save completed: ${successCount} images saved successfully, ${failCount} failed.`)
                setSelectedImages([])
            } catch (error) {
                console.error('Bulk save failed:', error)
                alert(`Failed to save images: ${error.message}`)
            } finally {
                setIsSubmitting(false)
            }
        }

        const handleDownloadSelected = (index) => {
            const image = galleryImages[index];
            if (image) {
              setCurrentDownloadImage({ ...image, imageUrl: image.imageUrl }); // Use original imageUrl
              setDownloadType('single');
              setShowDownloadModal(true);
            }
          };

        const handleSaveSelected = async (index) => {
            if (!currentUser?.id) {
                alert('Please sign in to save images')
                return
            }
        
            const image = galleryImages[index]
            if (!image?._id) {
                alert('Invalid image selected')
                return
            }
        
            setIsSubmitting(true)
            try {
                const response = await fetch('https://bcc-gallery-back-end.onrender.com/saved/add', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        userId: Number(currentUser.id),
                        imageId: image._id
                    })
                })
        
                const data = await response.json()
                if (!response.ok) {
                    throw new Error(data.message || 'Failed to save image')
                }
        
                alert('Image saved successfully!')
            } catch (error) {
                console.error('Error saving image:', error)
                alert(`${error.message}`)
            } finally {
                setIsSubmitting(false)
            }
        }
        const openFullscreen = (imageSrc) => {
            setFullscreenImage(imageSrc)
        }

        const closeFullscreen = () => {
            setFullscreenImage(null)
        }

        const closeDownloadModal = () => {
            if (!isDownloading) {
            setShowDownloadModal(false);
            setCurrentDownloadImage(null);
            setDownloadProgress(0);
            setSelectedFormat('png');
            }
        }

        
        useEffect(() => {
            const handleEscape = (e) => {
            if (e.key === "Escape") {
                closeFullscreen()
                if (!isDownloading) {
                closeDownloadModal()
                }
            }
            }

            if (fullscreenImage || showDownloadModal) {
            document.addEventListener("keydown", handleEscape)
            document.body.style.overflow = "hidden"
            } else {
            document.body.style.overflow = "unset"
            }

            return () => {
            document.removeEventListener("keydown", handleEscape)
            document.body.style.overflow = "unset"
            }
        }, [fullscreenImage, showDownloadModal, isDownloading])

        return (
            <div className="page-container">
            {/* User Signup Modal */}
            {showUserModal && (
                <div className="user-modal-overlay">
                <div className="user-modal">
                    <div className="user-modal-header">
                    <div className="user-modal-icon">
                        <User className="modal-user-icon" />
                    </div>
                    <h2 className="user-modal-title">Welcome to BCC Gallery</h2>
                    <p className="user-modal-subtitle">Please enter your full name to continue</p>
                    </div>
                    
                    <div onSubmit={handleUserSignup} className="user-modal-form">
                    <div className="form-group">
                        <label htmlFor="userName" className="form-label">Full Name</label>
                        <input
                        type="text"
                        id="userName"
                        value={userName}
                        onChange={(e) => setUserName(e.target.value)}
                        placeholder="Enter your full name"
                        className="form-input"
                        disabled={isSubmitting}
                        required
                        />
                    </div>
                    
                    <button
                        type="button"
                        onClick={handleUserSignup}
                        className="form-submit-btn"
                        disabled={isSubmitting || !userName.trim()}
                    >
                        {isSubmitting ? (
                        <>
                            <Loader2 className="submit-loader" />
                            Creating Account...
                        </>
                        ) : (
                        'Continue'
                        )}
                    </button>
                    </div>
                </div>
                </div>
            )}

            {/* Download Modal */}
            {showDownloadModal && (
    <div className="download-modal-overlay">
        <div className="download-modal">
            <div className="download-modal-header">
                <div className="download-modal-icon">
                    <Download className="modal-download-icon" />
                </div>
                <h2 className="download-modal-title">
                    {downloadType === 'single' ? 'Download Image' : `Download ${selectedImages.length} Images`}
                </h2>
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
                        {downloadType === 'multiple' && (
                            <div className="download-warning">
                                <p className="warning-text">
                                    <strong>Note:</strong> To download multiple images, please ensure your browser allows multiple download from this site. You may see a prompt in your browser’s address bar to allow multiple downloads. Click "Allow" to proceed.
                                </p>
                            </div>
                        )}
                        <div className="format-selection">
                            <h3 className="format-title">Select Format:</h3>
                            <div className="format-options">
                                <button
                                    className={`format-btn ${selectedFormat === 'jpeg' ? 'format-active' : ''}`}
                                    onClick={() => setSelectedFormat('jpeg')}
                                >
                                    <span className="format-name">JPEG</span>
                                    <span className="format-desc">Best for photos, smaller size</span>
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
                                onClick={downloadType === 'single' ? handleSingleDownload : handleMultipleDownload}
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
                            <h3 className="progress-title">
                                {downloadType === 'single' ? 'Downloading Image...' : `Downloading Images...`}
                            </h3>
                            <p className="progress-subtitle">
                                {downloadType === 'multiple' && `${Math.ceil((downloadProgress / 100) * selectedImages.length)} of ${selectedImages.length} images`}
                            </p>
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
                            <span>Please wait while we prepare your {downloadType === 'single' ? 'image' : 'images'}...</span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    </div>
)}

            {/* Fixed Header */}
            <header className="header">
                <div className="header-content">
                <div className="header-left">
                    <div className="logo-container">
                    <img src={bcclogo} alt="Logo" className="logos" />
        </div>
                    <h1 className="header-title">
                    BCC Gallery 1.0
                    <div className="header-underline"></div>
                    </h1>
                </div>
                <button onClick={toggleMenu} className="menu-button" aria-label="Toggle menu">
                    <Menu className="menu-icon" />
                </button>
                </div>
            </header>

            {/* Sliding Menu Overlay */}
            {isMenuOpen && <div className="menu-overlay" onClick={toggleMenu} />}


            <div className={`sliding-menu ${isMenuOpen ? "menu-open" : ""}`}>
                <div className="menu-content">
                <div className="menu-header">
                    <h2 className="menu-title">Menu</h2>
                    <button onClick={toggleMenu} className="close-button">
                    <X className="close-icon" />
                    </button>
                </div>

                <nav className="menu-nav">
                    <Link to="/albums" className="menu-item" onClick={toggleMenu}>
                    <Image className="menu-item-icon" />
                    <span className="menu-item-text">Albums</span>
                    </Link>

                    <Link to="/saved" className="menu-item" onClick={toggleMenu}>
                    <Heart className="menu-item-icon" />
                    <span className="menu-item-text">Saved</span>
                    </Link>

                    <Link to="/notification" className="menu-item" onClick={toggleMenu}>
                    <Bell className="menu-item-icon" />
                    <span className="menu-item-text">Notification</span>
                    </Link>
                </nav>

                <div className="menu-user">
                    
                    <div className="user-name">{currentUser?.name || "Pastor David Johnson"}</div>
                </div>
                </div>
            </div>

            {/* Hero Section */}
            <div className="hero-section">
                <div className="decoration-top"></div>
                <div className="decoration-bottom"></div>
                <div className="hero-content">
                <h2 className="welcome-title">
                    Welcome to{" "}
                    <span className="welcome-highlight">
                    BCC Gallery
                    <div className="welcome-underline"></div>
                    </span>
                </h2>
                <p className="welcome-description">
                    Discover the <span className="text-highlight">beautiful moments</span> and memories captured in the church
                    community. <span className="text-bold">Browse through the collection of</span> celebrations,
                    and fellowship.
                </p>
                <div className="welcome-line-container">
                    <div className="welcome-line"></div>
                </div>
                </div>
            </div>

            {/* Scrollable Content */}
            <div className="scrollable-content">
                {/* Auto-sliding Carousel */}
                <div className="carousel-container">
                {isLoadingCarousel ? (
                    <div className="loading-container">
                    <Loader2 className="loading-spinner" />
                    <p>Loading carousel images...</p>
                    </div>
                ) : carouselError ? (
                    <div className="error-container">
                    <p>Error loading carousel: {carouselError}</p>
                    <button onClick={fetchCarouselImages} className="retry-btn">Retry</button>
                    </div>
                ) : carouselImages.length === 0 ? (
                    <div className="no-images-container">
                    <p>No carousel images available</p>
                    </div>
                ) : (
                    <>
{/* hhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhhjjjjjjjjjjjjjjjjjj */}
                    {/* vaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa */}
                  
<div className="carousel">
  {carouselImages.map((image, index) => {
    let slideClass = "carousel-slide";
    if (index === currentSlide && !isTransitioning) {
      slideClass += " slide-active";
    } else if (index === currentSlide && isTransitioning) {
      slideClass += " slide-exiting";
    } else if (index === (currentSlide + 1) % carouselImages.length && isTransitioning) {
      slideClass += " slide-entering";
    }
    
    return (
      <div key={image._id || index} className={slideClass}>
        <img
          src={image.thumbnailUrl || image.imageUrl || "/placeholder.svg"} // Use thumbnail for display
          alt={`Church gallery image ${index + 1}`}
          className="carousel-image"
          onClick={() => openFullscreen(image.imageUrl)} // Use original for fullscreen
        />
        <div className="carousel-overlay" />
      </div>
    );
  })}
  <div className="carousel-content">
    <center></center>
  </div>
</div>

                    </>
                )}
                </div>

                {/* Sunday Service Section */}
                <div className="service-section">
                <h3 className="service-title">
    {isLoadingAlbum ? (
        <span>Loading album title...</span>
    ) : albumError || !latestAlbumTitle ? (
        <span>No album available</span>
    ) : (
        latestAlbumTitle
    )}
    <b className="welcome-underline"></b>
</h3>
                

                {/* Action Buttons */}
                <div className="action-buttons">
                    <button onClick={handleDownloadAll} className="action-btn download-all">
                    <Download className="btn-icon" />
                    Download All ({selectedImages.length} selected)
                    </button>
                    <button onClick={handleSaveAll} className="action-btn save-all">
    <Save className="btn-icon" />
    Save All ({selectedImages.length} selected)
</button>
                </div>

                <hr />

                {/* Image Gallery */}
                {isLoadingGallery ? (
                    <div className="loading-container">
                    <Loader2 className="loading-spinner" />
                    <p>Loading gallery images...</p>
                    </div>
                ) : galleryError ? (
                    <div className="error-container">
                    <p>Error loading gallery: {galleryError}</p>
                    <button onClick={fetchGalleryImages} className="retry-btn">Retry</button>
                    </div>
                ) : galleryImages.length === 0 ? (
                    <div className="no-images-container">
                    <p>No gallery images available</p>
                    </div>
                ) : (
                    <div className="image-gallery">
  {galleryImages.map((image, index) => (
    <div key={image._id || index} className="image-card">
      <div className="image-container">
        <img
          src={image.thumbnailUrl || image.imageUrl || "/placeholder.svg"} // Use thumbnail for display
          alt={`Service ${index + 1}`}
          className="gallery-image"
          onClick={() => openFullscreen(image.imageUrl)} // Use original for fullscreen
        />
        <div className="image-overlay">
          <input
            type="checkbox"
            className="image-checkbox"
            checked={selectedImages.includes(index)}
            onChange={() => handleImageSelect(index)}
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      </div>
                        
                {/* Reaction Section */}
                <div className="reaction-section">
    <button
      className={`reaction-btn ${isUserReacted(image._id, 'partyPopper') ? 'reaction-active' : ''}`}
      onClick={() => debouncedHandleReaction(image._id, 'partyPopper')}
      title="Party Popper"
      disabled={!currentUser || disabledButtons.has(`${image._id}_partyPopper`)}
    >
      🎉 <span className="reaction-count">{getReactionCount(image, 'partyPopper')}</span>
    </button>
    <button
      className={`reaction-btn ${isUserReacted(image._id, 'thumbsUp') ? 'reaction-active' : ''}`}
      onClick={() => debouncedHandleReaction(image._id, 'thumbsUp')}
      title="Thumbs Up"
      disabled={!currentUser || disabledButtons.has(`${image._id}_thumbsUp`)}
    >
      👍 <span className="reaction-count">{getReactionCount(image, 'thumbsUp')}</span>
    </button>
    <button
      className={`reaction-btn ${isUserReacted(image._id, 'redHeart') ? 'reaction-active' : ''}`}
      onClick={() => debouncedHandleReaction(image._id, 'redHeart')}
      title="Red Heart"
      disabled={!currentUser || disabledButtons.has(`${image._id}_redHeart`)}
    >
      ❤️ <span className="reaction-count">{getReactionCount(image, 'redHeart')}</span>
    </button>
    <button
      className={`reaction-btn ${isUserReacted(image._id, 'fire') ? 'reaction-active' : ''}`}
      onClick={() => debouncedHandleReaction(image._id, 'fire')}
      title="Fire"
      disabled={!currentUser || disabledButtons.has(`${image._id}_fire`)}
    >
      🔥 <span className="reaction-count">{getReactionCount(image, 'fire')}</span>
    </button>
  </div>
                        
                        <div className="image-actions">
                        <button
          onClick={() => handleDownloadSelected(index)}
          className="image-btn download-btn"
          title="Download"
        >
          <Download className="image-btn-icon" />
        </button>
        <button
          onClick={() => handleSaveSelected(index)}
          className="image-btn save-btn"
          title="Save"
          disabled={isSubmitting}
        >
          <Save className="image-btn-icon" />
        </button>
                        </div>
                        </div>
                    ))}
                    </div>
                )}
                </div>

                {/* Footer */}
                <footer className="footer">
                <div className="footer-content">
                    <div className="footer-info">
                    <h3 className="footer-title">Believers Community Church</h3>
                    <p className="footer-subtitle">God's platfrom for building men</p>
                    </div>
                    <div className="footer-copyright">
                    <p className="copyright-text">© {new Date().getFullYear()} BCC Media. All rights reserved.</p>
                    </div>
                </div>
                </footer>
            </div>

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
        )
        }

        export default HomePage

     
        // aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa
        