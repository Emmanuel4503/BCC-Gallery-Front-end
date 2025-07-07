import { useState, useEffect, useCallback,useRef } from "react"
import { Menu, X, Heart, Bell, Download, Save, User, Loader2, ArrowUp } from "lucide-react"
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

const [loadingImages, setLoadingImages] = useState({});
const timeouts = useRef({}); 
const [isLoadingFullscreen, setIsLoadingFullscreen] = useState(false);

// HDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDD
// HHHHHHHHHHHHHHHHHHHHHHHHHHHHHH
// hhhhhhhhhhhhhhhhhhhhhhhhhhh
// ghhhhhhh
// hhhhh
// Add these functions after your existing state declarations and before the notification functions

const CACHE_DURATION = 1 * 60 * 1000; // 5 minutes in milliseconds
const CAROUSEL_CACHE_KEY = 'bcc_carousel_cache';
const GALLERY_CACHE_KEY = 'bcc_gallery_cache';
const ALBUM_CACHE_KEY = 'bcc_album_cache';

const setCacheData = (key, data) => {
  try {
    const cacheData = {
      data: data,
      timestamp: Date.now(),
      expiresAt: Date.now() + CACHE_DURATION
    };
    localStorage.setItem(key, JSON.stringify(cacheData));
  } catch (error) {
    console.error('Error setting cache data:', error);
  }
};

const getCacheData = (key) => {
  try {
    const cached = localStorage.getItem(key);
    if (!cached) return null;
    
    const cacheData = JSON.parse(cached);
    if (Date.now() > cacheData.expiresAt) {
      // Cache expired, remove it
      localStorage.removeItem(key);
      return null;
    }
    
    return cacheData.data;
  } catch (error) {
    console.error('Error getting cache data:', error);
    // Remove corrupted cache
    localStorage.removeItem(key);
    return null;
  }
};

const clearExpiredCache = () => {
  try {
    [CAROUSEL_CACHE_KEY, GALLERY_CACHE_KEY, ALBUM_CACHE_KEY].forEach(key => {
      const cached = localStorage.getItem(key);
      if (cached) {
        const cacheData = JSON.parse(cached);
        if (Date.now() > cacheData.expiresAt) {
          localStorage.removeItem(key);
        }
      }
    });
  } catch (error) {
    console.error('Error clearing expired cache:', error);
  }
};


const [isTransitioning, setIsTransitioning] = useState(false)
// const [isPreLoading, setIsPreLoading] = useState(true);
// const [preloadProgress, setPreloadProgress] = useState(0);
const [notificationQueue, setNotificationQueue] = useState([]);
const [currentNotification, setCurrentNotification] = useState(null);


const addNotification = (message) => {
  setNotificationQueue((prev) => [...prev, { id: Date.now(), message }]);
};

const removeCurrentNotification = () => {
  setCurrentNotification(null);
};

// Process the notification queue
useEffect(() => {
  let isMounted = true;
  if (!currentNotification && notificationQueue.length > 0) {
    const nextNotification = notificationQueue[0];
    if (isMounted) {
      setCurrentNotification(nextNotification);
      setNotificationQueue((prev) => prev.slice(1));
    }

    const timeoutId = setTimeout(() => {
      if (isMounted) removeCurrentNotification();
    }, 10000);

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
    };
  }
  return () => {
    isMounted = false;
  };
}, [currentNotification, notificationQueue]);

const removeNotification = (id) => {
  setNotificationQueue((prev) => prev.filter((notification) => notification.id !== id));
  if (currentNotification?.id === id) {
    setCurrentNotification(null);
  }
};

const [errorImages, setErrorImages] = useState({});
const handleImageLoad = (imageId) => {
  // console.log(`Image loaded at: ${new Date().toISOString()}, imageId: ${imageId}`);
  setLoadingImages((prev) => {
    const newState = { ...prev, [imageId]: false };
    return newState;
  });
  setErrorImages((prev) => {
    const newErrors = { ...prev };
    delete newErrors[imageId];
    return newErrors;
  });
  if (timeouts.current[imageId]) {
    clearTimeout(timeouts.current[imageId]);
    delete timeouts.current[imageId];
  }
  // Force re-render if needed
  setTimeout(() => {
    setLoadingImages((prev) => ({ ...prev }));
  }, 0);
};

const handleImageError = (imageId, imageUrl) => {
  console.error(`Image error at: ${new Date().toISOString()}, imageId: ${imageId}, url: ${imageUrl}`);
  setLoadingImages((prev) => ({ ...prev, [imageId]: false }));
  setErrorImages((prev) => ({
    ...prev,
    [imageId]: 'Failed to load image. Please try again.'
  }));
  if (timeouts.current[imageId]) {
    clearTimeout(timeouts.current[imageId]);
    delete timeouts.current[imageId];
  }
};

const RETRY_TIMEOUT = navigator.connection?.effectiveType === '2g' ? 40000 : 25000;
const handleImageRetry = (imageId, imageUrl) => {
  console.log(`Retrying image load: ${imageId}`);
  setErrorImages((prev) => {
    const newErrors = { ...prev };
    delete newErrors[imageId];
    return newErrors;
  });
  setLoadingImages((prev) => ({ ...prev, [imageId]: true }));
  if (timeouts.current[imageId]) {
    clearTimeout(timeouts.current[imageId]);
    delete timeouts.current[imageId];
  }
  const img = new window.Image();
  img.src = imageUrl;
  img.crossOrigin = 'anonymous';
  img.onload = () => handleImageLoad(imageId);
  img.onerror = () => {
    timeouts.current[imageId] = setTimeout(() => {
      handleImageError(imageId, imageUrl);
    }, RETRY_TIMEOUT);
  };
};

const fetchCarouselImages = async () => {
  try {
    setIsLoadingCarousel(true);
    setCarouselError(null);
    
    // Check cache first
    const cachedData = getCacheData(CAROUSEL_CACHE_KEY);
    if (cachedData) {
      console.log('Loading carousel images from cache');
      setCarouselImages(cachedData);
      // Skip individual loading for cached images
      setIsLoadingCarousel(false);
      return;
    }
    
    // Fetch from backend if no cache
    const response = await fetch('https://bcc-gallery-back-end-production.up.railway.app/images/selected');
    if (!response) {
      throw new Error('No response received from server');
    }
    if (!response.ok) {
      if (response.status >= 500) {
        throw new Error('Database error: Unable to retrieve carousel images from the server.');
      }
      throw new Error(`Failed to fetch carousel images: ${response.status}`);
    }
    const data = await response.json();
    // hffffffffffffffffffffffffffffffffffffffffffff
    // hffffffffffffffffffffffffffffffffffff
    // gffffffffffffffffffffffffffffffffffffffffffffff
    // Cache the data
    setCacheData(CAROUSEL_CACHE_KEY, data);
    setCarouselImages(data);
    // Preload images
    data.forEach((image) => {
      const img = new window.Image();
      img.src = image.thumbnailUrl || image.imageUrl || '/placeholder.svg';
      img.crossOrigin = 'anonymous';
      img.onload = () => handleImageLoad(image._id);
      img.onerror = () => handleImageError(image._id, img.src);
    });
    // Initialize loading state for gallery images
    const initialLoadingState = data.reduce((acc, image) => {
        acc[image._id] = true;
        return acc;
    }, {});
    setLoadingImages((prev) => ({ ...prev, ...initialLoadingState }));
  } catch (error) {
    console.error('Error fetching carousel images:', error);
    let message;
    if (!navigator.onLine) {
        message = 'No internet connection. Please check your network and try again.';
    } else if (error.message.includes('Database error')) {
        message = 'Unable to load carousel images due to a server issue. Please try again later.';
    } else {
        message = 'Network error. Failed to connect to the server. Please try again.';
    }
    addNotification(message);
    setCarouselError(error.message);
    setCarouselImages([]);
  } finally {
    setIsLoadingCarousel(false);
  }
};

const fetchGalleryImages = async (silent = false) => {
  try {
    if (!silent) {
      setIsLoadingGallery(true);
    }
    setGalleryError(null);
    
    // Check cache first
    const cachedData = getCacheData(GALLERY_CACHE_KEY);
    if (cachedData) {
      console.log('Loading gallery images from cache');
      setGalleryImages(cachedData);
      return;
    }
    
    // Fetch from backend if no cache
    console.log('Fetching gallery images from backend');
    const response = await fetch('https://bcc-gallery-back-end-production.up.railway.app/images/latest');
    if (!response.ok) {
      if (response.status >= 500) {
        throw new Error('Database error: Unable to retrieve gallery images from the server.');
      }
      throw new Error(`Failed to fetch gallery images: ${response.status}`);
    }
    const data = await response.json();
    
    // Cache the data
    setCacheData(GALLERY_CACHE_KEY, data);
    setGalleryImages(data);
    // Preload images
    data.forEach((image) => { 
      const img = new window.Image();
      img.src = image.thumbnailUrl || image.imageUrl || '/placeholder.svg';
      img.crossOrigin = 'anonymous';
      img.onload = () => handleImageLoad(image._id);
      img.onerror = () => handleImageError(image._id, img.src);
    });
    // Initialize loading state for gallery images
    const initialLoadingState = data.reduce((acc, image) => {
      acc[image._id] = true;
      return acc;
    }, {});
    setLoadingImages((prev) => ({ ...prev, ...initialLoadingState }));
  } catch (error) {
    console.error('Error fetching gallery images:', error);
    let message;
    if (!navigator.onLine) {
      message = 'No internet connection. Please check your network and try again.';
    } else if (error.message.includes('Database error')) {
      message = 'Unable to load gallery images due to a server issue. Please try again later.';
    } else {
      message = 'Network error: Failed to connect to the server. Please try again.';
    }
    addNotification(message);
    setGalleryError(error.message);
    setGalleryImages([]);
  } finally {
    setIsLoadingGallery(false); // Always reset loading state
  }
};



const fetchUserReactions = async (userId) => {
  try {
    const response = await fetch(`https://4a9d-135-129-124-46.ngrok-free.app/reactions/user/${userId}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
        'ngrok-skip-browser-warning': 'true'
      },
      mode: 'cors'
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch reactions: ${response.status}`);
    }

    const data = await response.json();
    const reactions = data.reduce((acc, reaction) => {
      acc[`${reaction.imageId}_${userId}`] = reaction.reactionType;
      return acc;
    }, {});
    setUserReactions(reactions);
  } catch (error) {
    console.error('Error fetching reactions:', error);
    addNotification('Failed to load reactions. Please try again.');
  }
};

      const fetchLatestAlbum = async () => {
        try {
          setIsLoadingAlbum(true);
          setAlbumError(null);
      
          // Check cache first
          const cachedData = getCacheData(ALBUM_CACHE_KEY);
          if (cachedData) {
            console.log('Loading album data from cache');
            setLatestAlbumTitle(cachedData?.title || null);
            setIsLoadingAlbum(false);
            return;
          }
      
          // Fetch from backend if no cache
          console.log('Fetching album data from backend');
          const response = await fetch('https://bcc-gallery-back-end-production.up.railway.app/album/latest');
      
          if (!response.ok) {
            if (response.status >= 500) {
              throw new Error('Database error: Unable to retrieve the latest album from the server.');
            }
            throw new Error(`Failed to fetch latest album: ${response.status}`);
          }
      
          const data = await response.json();
          
          // Cache the data
          setCacheData(ALBUM_CACHE_KEY, data);
          
          setLatestAlbumTitle(data?.title || null);
        } catch (error) {
          console.error('Error fetching latest album:', error);
          let message;
          if (!navigator.onLine) {
            message = 'No internet connection. Please check your network and try again.';
          } else if (error.message.includes('Database error')) {
            message = 'Unable to load the latest album due to a server issue. Please try again later.';
          } else {
            message = 'Network error: Failed to connect to the server. Please try again.';
          }
          addNotification(message);
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
        const response = await fetch('https://bcc-gallery-back-end-production.up.railway.app/images/react', {
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
  
        // Update only the specific image's reaction data without resetting loading state
        setGalleryImages((prevImages) =>
          prevImages.map((image) =>
            image._id === imageId
              ? {
                  ...image,
                  reactions: {
                    ...image.reactions,
                    [reactionType]: (image.reactions?.[reactionType] || 0) + (currentUserReaction === reactionType ? -1 : 1),
                    ...(currentUserReaction && currentUserReaction !== reactionType && {
                      [currentUserReaction]: (image.reactions?.[currentUserReaction] || 0) - 1,
                    }),
                  },
                }
              : image
          )
        );
  
        // Re-fetch user reactions to ensure consistency
        await fetchUserReactions(Number(currentUser.id));
      } catch (error) {
        console.error('Error processing reaction:', error);
        let message;
        if (!navigator.onLine) {
          message = 'No internet connection. Please check your network and try again.';
        } else if (error.message.includes('Failed to fetch') || error.message.includes('Server error')) {
          message = 'Unable to process reaction due to a server issue. Please try again later.';
        } else {
          message = `Failed to process reaction: ${error.message}`;
        }
        addNotification(message);
      
        // Revert reaction state
        setUserReactions((prev) => {
          const newReactions = { ...prev };
          if (currentUserReaction === reactionType) {
            newReactions[reactionKey] = reactionType;
          } else {
            delete newReactions[reactionKey];
          }
          return newReactions;
        });
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
    [currentUser, userReactions, fetchUserReactions]
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
  if (!imageUrl.match(/\.(jpg|jpeg|png|webp|heic)$/i)) {
    throw new Error('Invalid image format in URL');
  }

  try {
    console.log('Downloading image:', { imageUrl, filename, format });

    if (!imageUrl || typeof imageUrl !== 'string') {
      throw new Error('Invalid image URL provided');
    }

    let processedUrl = imageUrl;
    if (!imageUrl.startsWith('http')) {
      processedUrl = `https://res.cloudinary.com/dzqlfez2p/image/upload/${imageUrl}`;
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
        let message;
        if (!navigator.onLine) {
          message = 'No internet connection. Please check your network and try again.';
        } else if (error.message.includes('Failed to fetch')) {
          message = 'Unable to download image due to a server issue. Please try again later.';
        } else {
          message = `Failed to download image: ${error.message}`;
        }
        addNotification(message);
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
        const imageId = selectedImages[i];
        const image = galleryImages.find((img) => img._id === imageId);
        console.log(`Processing image with id ${imageId}:`, image);
        if (image && image.imageUrl) {
          try {
            const randomNumber = Math.floor(1000 + Math.random() * 9000);
            await downloadImage(
              image.imageUrl,
              `BCC-image-${imageId}-${Date.now()}-${randomNumber}`,
              selectedFormat
            );
            successCount++;
            console.log(`Successfully downloaded image with id ${imageId}`);
          } catch (error) {
            console.error('Bulk download failed:', error);
            let message;
            if (!navigator.onLine) {
              message = 'No internet connection. Please check your network and try again.';
            } else if (error.message.includes('Failed to fetch')) {
              message = 'Unable to download images due to a server issue. Please try again later.';
            } else {
              message = `Failed to download images: ${error.message}`;
            }
            addNotification(message);
            failCount++;
          }
        } else {
          console.error(`No valid image found with id ${imageId}`);
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
      console.error('Bulk download error:', error);
      let message;
      if (!navigator.onLine) {
        message = 'No internet connection. Please check your network and try again.';
      } else if (error.message.includes('Failed to fetch')) {
        message = 'Unable to download image due to a server issue.';
      } else {
        message = `Failed to download image: ${error.message}`;
      }
      addNotification(message);
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
  // Clear expired cache on component mount
  clearExpiredCache();
}, []);

// useEffect(() => {
//   if (!carouselImages.length && !galleryImages.length) {
//       setIsLoadingCarousel(false);
//       setIsLoadingGallery(false);
//       return;
//   }

//   const allImages = [
//       ...carouselImages.map(image => image.imageUrl),
//       ...galleryImages.map(image => image.thumbnailUrl || image.imageUrl)
//   ].filter(url => url && typeof url === 'string');

//   if (!allImages.length) {
//       setIsLoadingCarousel(false);
//       setIsLoadingGallery(false);
//       return;
//   }

//   let loadedImages = 0;
//   const totalImages = allImages.length;

//   const updateProgress = () => {
//       loadedImages += 1;
//       if (loadedImages >= totalImages) {
//           setIsLoadingCarousel(false);
//           setIsLoadingGallery(false);
//       }
//   };

//   allImages.forEach(url => {
//       const img = new window.Image();
//       img.src = url;
//       img.onload = updateProgress;
//       img.onerror = () => {
//           console.error(`Failed to preload image: ${url}`);
//           updateProgress(); // Continue even if one image fails
//       };
//   });

//   // Fallback in case some images take too long
//   const fallbackTimeout = setTimeout(() => {
//       if (loadedImages < totalImages) {
//           setIsLoadingCarousel(false);
//           setIsLoadingGallery(false);
//       }
//   }, 10000); // 10-second timeout

//   return () => clearTimeout(fallbackTimeout);
// }, [carouselImages, galleryImages]);

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
    
    const response = await fetch('https://bcc-gallery-back-end-production.up.railway.app/users/signup', {
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
        console.error('Signup error:', error);
        let message;
        if (!navigator.onLine) {
          message = 'No internet connection. Please check your network and try again.';
        } else if (error.message.includes('Failed to fetch')) {
          message = 'Cannot connect to server. Please try again later.';
        } else if (error.message.includes('non-JSON response')) {
          message = 'Server error. Invalid response format.';
        } else {
          message = `Failed to create account: ${error.message}`;
        }
        addNotification(message);
      }finally {
    setIsSubmitting(false)
    }
}
const isImageSaved = async (userId, imageId) => {
  try {
    const response = await fetch(
      `https://bcc-gallery-back-end-production.up.railway.app/saved/check?userId=${userId}&imageId=${imageId}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
    if (!response.ok) {
      throw new Error('Failed to check save status');
    }
    const data = await response.json();
    return data.isSaved; // Assume backend returns { isSaved: boolean }
  } catch (error) {
    console.error('Error checking save status:', error);
    return false; // Default to false if check fails
  }
};

useEffect(() => {
  if (carouselImages.length === 0 || isLoadingCarousel || carouselError) return;

  const loadedImagesCount = carouselImages.filter(
    (image) => !loadingImages[image._id]
  ).length;

  if (loadedImagesCount < Math.min(5, carouselImages.length)) return;

  const timer = setInterval(() => {
    setIsTransitioning(true);
    setTimeout(() => {
      setCurrentSlide((prev) => (prev + 1) % carouselImages.length);
      setIsTransitioning(false);
    }, 100);
  }, 5000);

  return () => clearInterval(timer);
}, [carouselImages, isLoadingCarousel, carouselError, loadingImages, currentSlide]);

const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen)
}
// jhhhhhh
// hhhh
const handleImageSelect = (imageId) => {
  setSelectedImages((prev) =>
    prev.includes(imageId) ? prev.filter((id) => id !== imageId) : [...prev, imageId]
  );
};
const handleDownloadAll = () => {
    if (selectedImages.length === 0) {
    alert('Please select at least one image using the checkboxes before Downloading.');
    return;
    }
  
    setDownloadType('multiple');
    setShowDownloadModal(true);
}

const handleSaveAll = async () => {
  if (!currentUser?.id) {
    alert('Please sign in to save images');
    return;
  }
  if (selectedImages.length === 0) {
    alert('Please select at least one image using the checkboxes before saving.');
    return;
  }
  setIsSubmitting(true);
  let successCount = 0;
  let failCount = 0;
  let alreadySavedCount = 0;
  try {
    for (const imageId of selectedImages) {
      const image = galleryImages.find((img) => img._id === imageId);
      if (!image?._id) {
        failCount++;
        continue;
      }
      try {
        const alreadySaved = await isImageSaved(Number(currentUser.id), image._id);
        if (alreadySaved) {
          alreadySavedCount++;
          continue;
        }
        const response = await fetch('https://bcc-gallery-back-end-production.up.railway.app/saved/add', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: Number(currentUser.id),
            imageId: image._id,
          }),
        });
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.message || 'Failed to save image');
        }
        successCount++;
      } catch (error) {
        console.error(`Failed to save image ${imageId}:`, error);
        failCount++;
      }
      await new Promise((resolve) => setTimeout(resolve, 300));
    }
    let message = `${successCount} image${successCount !== 1 ? 's' : ''} saved successfully`;
    if (failCount > 0) {
      message += `, ${failCount} failed`;
    }
    if (alreadySavedCount > 0) {
      message += `, ${alreadySavedCount} were already saved`;
    }
    message += '.';
    alert(message);
    setSelectedImages([]);
  } catch (error) {
    console.error('Bulk save failed:', error);
    let message;
    if (!navigator.onLine) {
      message = 'No internet connection. Please check your network and try again.';
    } else if (error.message.includes('Failed to fetch') || error.message.includes('Server error')) {
      message = 'Unable to save images due to a server issue. Please try again later.';
    } else {
      message = `Failed to save images: ${error.message}`;
    }
    alert(message);
  } finally {
    setIsSubmitting(false);
  }
};

const handleDownloadSelected = (imageId) => {
  const image = galleryImages.find((img) => img._id === imageId);
  if (image) {
    setCurrentDownloadImage({ ...image, imageUrl: image.imageUrl });
    setDownloadType('single');
    setShowDownloadModal(true);
  }
};

const handleSaveSelected = async (imageId) => {
  if (!currentUser?.id) {
    alert('Please sign in to save images');
    return;
  }
  
  const image = galleryImages.find((img) => img._id === imageId);
  if (!image?._id) {
    alert('Invalid image selected');
    return;
  }
  
  setIsSubmitting(true);
  try {
    const alreadySaved = await isImageSaved(Number(currentUser.id), image._id);
    if (alreadySaved) {
      alert('This image is already saved.');
      return;
    }
    
    const response = await fetch('https://bcc-gallery-back-end-production.up.railway.app/saved/add', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId: Number(currentUser.id),
        imageId: image._id,
      }),
    });
    
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'Failed to save image');
    }
    
    alert('Image saved successfully!');
  } catch (error) {
    console.error('Error saving image:', error);
    let message;
    if (!navigator.onLine) {
      message = 'No internet connection. Please check your network and try again.';
    } else if (error.message.includes('Failed to fetch') || error.message.includes('Server error')) {
      message = 'Unable to save image due to a server issue. Please try again later.';
    } else {
      message = `Failed to save image: ${error.message}`;
    }
    alert(message);
  } finally {
    setIsSubmitting(false);
  }
};

  const openFullscreen = (imageSrc) => {
    setIsLoadingFullscreen(true);
    setFullscreenImage(imageSrc);
};

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

const [showScrollTop, setShowScrollTop] = useState(false);
const handleScroll = useCallback(() => {
    const fourRowsHeight = 4 * 150 + 3 * 16; 
    // console.log('ScrollY:', window.scrollY, 'Threshold:', fourRowsHeight, 'ShowScrollTop:', showScrollTop);
    if (window.scrollY > fourRowsHeight) {
      setShowScrollTop(true);
    } else {
      setShowScrollTop(false);
    }
  }, []);
  
  const scrollToTop = () => {
    const header = document.querySelector('.header');
    const headerHeight = header ? header.offsetHeight : 0;
    const gallery = document.querySelector('.image-gallery');
    if (gallery) {
      window.scrollTo({
        top: gallery.offsetTop - headerHeight, // Stop at the first row of images, below the header
        behavior: 'smooth',
      });
    } else {
      window.scrollTo({
        top: headerHeight, // Fallback to below header if gallery not found
        behavior: 'smooth',
      });
    }
  };
  
  useEffect(() => {
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

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
    <div className="notification-container">
  {currentNotification && (
    <div className="notification">
      <span className="notification-message">{currentNotification.message}</span>
      <button
        className="notification-close"
        onClick={removeCurrentNotification}
      >
        <X className="close-icon" />
      </button>
    </div>
  )}
</div>

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
                {/* jdbgbgfffffffffffffffffffffffffffffdhhhhhhhhhhfjh */}
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
            {/* <Link to="/albums" className="menu-item" onClick={toggleMenu}>
            <Image className="menu-item-icon" />
            <span className="menu-item-text">Albums</span>
            </Link> */}

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

    {showScrollTop && (
<button
onClick={scrollToTop}
className={`scroll-top-btn ${showScrollTop ? 'visible' : ''}`}
aria-label="Scroll to top"
>
<ArrowUp className="scroll-top-icon" />
</button>
)}
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

        const imageUrl = image.imageUrl || "/placeholder.svg";
        return (
            <div key={image._id || index} className={slideClass}>
                {loadingImages[image._id] ? (
                    <div className="image-loading-container">
                        <Loader2 className="image-loading-spinner" />
                    </div>
                ) : (
                  // jfffffffffffffffffffffffffffffffffffffffffff
                  <img
                  src={imageUrl}
                  alt={`Church gallery image ${index + 1}`}
                  className="carousel-image"
                  crossOrigin="anonymous"
                  onLoad={() => handleImageLoad(image._id)}
                  onError={() => handleImageError(image._id, imageUrl)}
                  loading="lazy"
                /> 
                )}
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
                    <p style={{ color: "#6b7280", marginBottom: "0.50rem", marginTop: "1.4rem", textAlign: "center" }}>
  Found {galleryImages.length} image{galleryImages.length !== 1 ? "s" : ""}
</p>
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
                            {galleryImages.map((image, index) => {
                                const imageUrl = image.thumbnailUrl || image.imageUrl || "/placeholder.svg";
                                return (
                                  <div key={image._id || index} className="image-card">
                               <div
  className={`image-container ${
    errorImages[image._id] ? 'error' : loadingImages[image._id] ? 'loading' : 'loaded'
  }`} 
>
                                      {errorImages[image._id] ? (
                                          <div className="image-error-container">
                                              <span className="image-error-message">{errorImages[image._id]}</span>
                                              <button
                                                  className="image-retry-btn"
                                                  onClick={() => handleImageRetry(image._id, imageUrl)}
                                              >
                                                  Retry
                                              </button>
                                          </div>
                                      ) : loadingImages[image._id] ? (
                                          <div className="image-loading-container">
                                              <Loader2 className="image-loading-spinner" />
                                          </div>
                                      ) : (
                                        <img
                                        src={imageUrl}
                                        alt={`Service ${index + 1}`}
                                        className="gallery-image"
                                        crossOrigin="anonymous"
                                        onLoad={() => handleImageLoad(image._id)}
                                        onError={() => handleImageError(image._id, imageUrl)}
                                        onClick={() => openFullscreen(image.imageUrl)}
                                        loading="lazy"
                                      />
                                      )}
                                            <div className="image-overlay">
                                            <input
  type="checkbox"
  className="image-checkbox"
  checked={selectedImages.includes(image._id)}
  onChange={() => handleImageSelect(image._id)}
  onClick={(e) => e.stopPropagation()}
/>
                                            </div>
                                        </div>
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
    onClick={() => handleDownloadSelected(image._id)}
    className="image-btn download-btn"
    title="Download"
  >
    <Download className="image-btn-icon" />
  </button>
  <button
    onClick={() => handleSaveSelected(image._id)}
    className="image-btn save-btn"
    title="Save"
    disabled={isSubmitting}
  >
    <Save className="image-btn-icon" />
  </button>
</div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

        {/* Footer */}
        <footer className="footer">
        <div className="footer-content">
            <div className="footer-info">
            <h3 className="footer-title">Believers' Community Church</h3>
            <p className="footer-subtitle">God's platfrom for building men</p>
            </div>
            <div className="footer-copyright">
            <p className="copyright-text">© {new Date().getFullYear()} <a href="https://wa.me/+2349110241218" className="heic-modal-link" target="_blank" rel="noopener noreferrer">BCC Media.</a>  All rights reserved.</p>
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
    {isLoadingFullscreen && (
        <div className="image-loading-container">
            <Loader2 className="image-loading-spinner" />
        </div>
    )}
<img
  src={fullscreenImage || "/placeholder.svg"}
  alt="Fullscreen view"
  className="fullscreen-image"
  loading="lazy"
  onLoad={() => setIsLoadingFullscreen(false)}
  onError={() => {
    setIsLoadingFullscreen(false);
    addNotification('Failed to load fullscreen image.');
    setFullscreenImage(null);
  }}
/>
</div>
        </div>
    )}
    </div>
)

}

export default HomePage


// aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa
