"use client"

import { useState, useEffect, useCallback } from "react"
import { ArrowLeft, ImageIcon, ChevronDown, Download, X, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"

function AlbumsPage() {
  const [albums, setAlbums] = useState([])
  const [albumImages, setAlbumImages] = useState({})
  const [openAlbum, setOpenAlbum] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [imageErrors, setImageErrors] = useState({})
  const [fullscreenImage, setFullscreenImage] = useState(null)
  const [showDownloadModal, setShowDownloadModal] = useState(false)
  const [selectedFormat, setSelectedFormat] = useState("png")
  const [isDownloading, setIsDownloading] = useState(false)
  const [downloadProgress, setDownloadProgress] = useState(0)
  const [currentDownloadImage, setCurrentDownloadImage] = useState(null)
  const [imageLoadingStates, setImageLoadingStates] = useState({})

  // Split title into event name and date
  const splitTitle = (title) => {
    const match = title.match(/^(.*?)\s*($$.*$$)$/)
    if (match) {
      return [match[1].trim(), match[2]]
    }
    return [title, ""]
  }

  // Fetch all albums
  const fetchAlbums = useCallback(async () => {
    setIsLoading(true)
    try {
      const response = await fetch("https://bcc-gallery-back-end.onrender.com/album/get", {
        mode: "cors",
        credentials: "omit",
      })
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`)
      }
      const data = await response.json()
      console.log("Fetched albums:", data)
      const validAlbums = data
        .filter((album) => album && (album.title || album._id))
        .map((album, index) => ({
          ...album,
          displayName: album.title || album._id || `Album ${index + 1}`,
        }))
      setAlbums(validAlbums)
      setIsLoading(false)
    } catch (error) {
      console.error("Error fetching albums:", error)
      setError("Failed to load albums. Please try again later.")
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAlbums()
  }, [fetchAlbums])

  // Fetch album images
  const fetchAlbumImages = useCallback(async (albumTitle, retries = 3) => {
    if (!albumTitle || typeof albumTitle !== "string") {
      console.error(`Invalid album title: ${albumTitle}`)
      setImageErrors((prev) => ({ ...prev, [albumTitle]: "Invalid album title" }))
      setImageLoadingStates((prev) => ({ ...prev, [albumTitle]: false }))
      return
    }

    setImageLoadingStates((prev) => ({ ...prev, [albumTitle]: true }))

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        console.log(`Fetching images for album: ${albumTitle}, attempt ${attempt}`)
        const response = await fetch(
          `https://bcc-gallery-back-end.onrender.com/images/album/${encodeURIComponent(albumTitle)}`,
          {
            mode: "cors",
            credentials: "omit",
          },
        )

        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status} ${response.statusText}`)
        }

        const data = await response.json()
        console.log(`Received ${data.length} images for album: ${albumTitle}`)

        if (!Array.isArray(data)) {
          throw new Error("Invalid response: Expected an array of images")
        }

        const processedData = data.slice(0, 20).map((image) => {
          let imageUrl = image.imageUrl || image.thumbnailUrl
          if (imageUrl && !imageUrl.startsWith("http")) {
            imageUrl = `https://bcc-gallery-back-end.onrender.com${imageUrl.startsWith("/") ? imageUrl : `/${imageUrl}`}`
          }
          return {
            ...image,
            imageUrl: imageUrl || "/placeholder.svg?height=150&width=150",
          }
        })

        setAlbumImages((prev) => ({ ...prev, [albumTitle]: processedData }))
        setImageErrors((prev) => ({ ...prev, [albumTitle]: "" }))
        setImageLoadingStates((prev) => ({ ...prev, [albumTitle]: false }))
        return
      } catch (error) {
        console.error(`Attempt ${attempt} failed for album ${albumTitle}:`, error.message)
        if (attempt === retries) {
          setImageErrors((prev) => ({
            ...prev,
            [albumTitle]: `Failed to load images after ${retries} attempts: ${error.message}`,
          }))
          setImageLoadingStates((prev) => ({ ...prev, [albumTitle]: false }))
        }
        await new Promise((resolve) => setTimeout(resolve, Math.pow(2, attempt) * 1000))
      }
    }
  }, [])

  // Toggle album dropdown
  const toggleAlbum = useCallback(
    (albumTitle) => {
      if (openAlbum === albumTitle) {
        setOpenAlbum(null)
      } else {
        setOpenAlbum(albumTitle)
        if (!albumImages[albumTitle] && !imageErrors[albumTitle] && !imageLoadingStates[albumTitle]) {
          fetchAlbumImages(albumTitle)
        }
      }
    },
    [openAlbum, albumImages, imageErrors, imageLoadingStates, fetchAlbumImages],
  )

  // Optimized fullscreen image opening
  const openFullscreen = useCallback((imageUrl) => {
    setFullscreenImage(imageUrl)
  }, [])

  const closeFullscreen = useCallback(() => {
    setFullscreenImage(null)
  }, [])

  // Download image function
  const downloadImage = useCallback(async (imageUrl, filename, format) => {
    try {
      let processedUrl = imageUrl
      if (!imageUrl.startsWith("http")) {
        processedUrl = `https://bcc-gallery-back-end.onrender.com${imageUrl.startsWith("/") ? imageUrl : `/${imageUrl}`}`
      }

      const response = await fetch(processedUrl, {
        mode: "cors",
        credentials: "omit",
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`)
      }

      const blob = await response.blob()
      if (!blob.type.startsWith("image/")) {
        throw new Error("Downloaded content is not an image")
      }

      const canvas = document.createElement("canvas")
      const ctx = canvas.getContext("2d")
      const img = document.createElement("img")

      return new Promise((resolve, reject) => {
        img.onload = () => {
          try {
            canvas.width = img.width
            canvas.height = img.height
            ctx.drawImage(img, 0, 0)

            const mimeType = format === "png" ? "image/png" : format === "webp" ? "image/webp" : "image/jpeg"
            const quality = format === "jpeg" ? 0.95 : undefined

            canvas.toBlob(
              (convertedBlob) => {
                if (convertedBlob) {
                  const url = URL.createObjectURL(convertedBlob)
                  const a = document.createElement("a")
                  a.href = url
                  a.download = `${filename}.${format}`
                  a.style.display = "none"
                  document.body.appendChild(a)
                  a.click()
                  document.body.removeChild(a)
                  URL.revokeObjectURL(url)
                  resolve()
                } else {
                  reject(new Error("Failed to convert image to selected format"))
                }
              },
              mimeType,
              quality,
            )
          } catch (error) {
            reject(new Error(`Canvas processing failed: ${error.message}`))
          }
        }

        img.onerror = () => reject(new Error("Failed to load image for processing"))
        img.crossOrigin = "anonymous"
        img.src = URL.createObjectURL(blob)
      })
    } catch (error) {
      console.error("Download error:", error)
      throw error
    }
  }, [])

  // Handle image download
  const handleDownload = useCallback((imageUrl) => {
    setCurrentDownloadImage(imageUrl)
    setShowDownloadModal(true)
  }, [])

  const handleSingleDownload = useCallback(async () => {
    if (!currentDownloadImage) {
      alert("No image selected for download")
      return
    }

    setIsDownloading(true)
    setDownloadProgress(0)

    try {
      const progressInterval = setInterval(() => {
        setDownloadProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval)
            return 90
          }
          return prev + 15
        })
      }, 200)

      await downloadImage(currentDownloadImage, `BCC Picture-${Date.now()}`, selectedFormat)

      clearInterval(progressInterval)
      setDownloadProgress(100)

      setTimeout(() => {
        setShowDownloadModal(false)
        setIsDownloading(false)
        setDownloadProgress(0)
        setCurrentDownloadImage(null)
        alert("Image downloaded successfully!")
      }, 1000)
    } catch (error) {
      console.error("Download failed:", error)
      alert(`Failed to download image: ${error.message}`)
      setIsDownloading(false)
      setDownloadProgress(0)
    }
  }, [currentDownloadImage, selectedFormat, downloadImage])

  const closeDownloadModal = useCallback(() => {
    if (!isDownloading) {
      setShowDownloadModal(false)
      setCurrentDownloadImage(null)
      setDownloadProgress(0)
      setSelectedFormat("png")
    }
  }, [isDownloading])

  // Handle Escape key for fullscreen and download modal
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === "Escape") {
        closeFullscreen()
        closeDownloadModal()
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
  }, [fullscreenImage, showDownloadModal, closeFullscreen, closeDownloadModal])

  // ImageThumbnail component - Fixed version
  const ImageThumbnail = ({ image, index, onFullscreen, onDownload }) => {
    const [imageLoaded, setImageLoaded] = useState(false)
    const [imageError, setImageError] = useState(false)

    return (
      <div className="relative overflow-hidden rounded-lg bg-gray-100 aspect-square">
        {!imageLoaded && !imageError && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
          </div>
        )}

        <img
          src={image.imageUrl || "/placeholder.svg"}
          alt={`Image ${index + 1}`}
          className={`w-full h-full object-cover cursor-pointer transition-opacity duration-200 ${
            imageLoaded ? "opacity-100" : "opacity-0"
          }`}
          onClick={() => !imageError && onFullscreen(image.imageUrl)}
          onLoad={() => {
            setImageLoaded(true)
            setImageError(false)
          }}
          onError={() => {
            console.error(`Failed to load image: ${image.imageUrl}`)
            setImageError(true)
            setImageLoaded(true)
          }}
        />

        {imageError && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-200">
            <ImageIcon className="w-8 h-8 text-gray-400" />
          </div>
        )}

        {imageLoaded && !imageError && (
          <Button
            size="sm"
            className="absolute top-2 right-2 bg-orange-500 hover:bg-orange-600 rounded-full p-2 h-auto"
            onClick={(e) => {
              e.stopPropagation()
              onDownload(image.imageUrl)
            }}
          >
            <Download className="w-4 h-4 text-white" />
          </Button>
        )}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Button variant="ghost" size="sm" className="p-2">
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <h1 className="text-xl font-semibold text-gray-900">Albums</h1>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-orange-100 rounded-full">
              <ImageIcon className="w-8 h-8 text-orange-600" />
            </div>
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Albums</h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Welcome to the Albums section! Here you'll find all the pictures from the church events and services,
            categorized.
          </p>
        </div>

        <div className="border-t border-gray-200 pt-8">
          {isLoading ? (
            <div className="text-center py-12">
              <Loader2 className="w-8 h-8 text-gray-400 animate-spin mx-auto mb-4" />
              <p className="text-gray-500">Loading albums...</p>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <p className="text-red-600">{error}</p>
            </div>
          ) : albums.length > 0 ? (
            <div className="space-y-4">
              <p className="text-gray-500 mb-6">
                Found {albums.length} album{albums.length !== 1 ? "s" : ""}
              </p>

              {albums.map((album, index) => {
                const [eventName, date] = splitTitle(album.displayName)
                return (
                  <Card key={`album-${album.displayName}-${index}`}>
                    <CardContent className="p-0">
                      <button
                        className="w-full p-6 text-left hover:bg-gray-50 transition-colors duration-200"
                        onClick={() => toggleAlbum(album.displayName)}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900">{eventName}</h3>
                            {date && <p className="text-sm text-gray-500 mt-1">{date}</p>}
                          </div>
                          <ChevronDown
                            className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${
                              openAlbum === album.displayName ? "rotate-180" : ""
                            }`}
                          />
                        </div>
                      </button>

                      {openAlbum === album.displayName && (
                        <div className="px-6 pb-6 border-t border-gray-100">
                          {imageErrors[album.displayName] ? (
                            <p className="text-red-600 italic py-4">{imageErrors[album.displayName]}</p>
                          ) : imageLoadingStates[album.displayName] ? (
                            <div className="flex items-center justify-center py-8">
                              <Loader2 className="w-6 h-6 text-gray-400 animate-spin mr-2" />
                              <span className="text-gray-500">Loading images...</span>
                            </div>
                          ) : albumImages[album.displayName]?.length > 0 ? (
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 mt-4">
                              {albumImages[album.displayName].slice(0, 20).map((image, imageIndex) => (
                                <ImageThumbnail
                                  key={`image-${album.displayName}-${image._id || imageIndex}`}
                                  image={image}
                                  index={imageIndex}
                                  onFullscreen={openFullscreen}
                                  onDownload={handleDownload}
                                />
                              ))}
                            </div>
                          ) : (
                            <p className="text-gray-500 italic py-4">No images found for this album.</p>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-500">Photo albums will be displayed here.</p>
            </div>
          )}
        </div>
      </main>

      {/* Download Modal */}
      <Dialog open={showDownloadModal} onOpenChange={closeDownloadModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Download className="w-5 h-5" />
              Download Image
            </DialogTitle>
          </DialogHeader>

          {!isDownloading ? (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-medium mb-3">Select Format:</h3>
                <RadioGroup value={selectedFormat} onValueChange={(value) => setSelectedFormat(value)}>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="jpeg" id="jpeg" />
                    <Label htmlFor="jpeg" className="flex-1">
                      <span className="font-medium">JPEG</span>
                      <span className="text-sm text-gray-500 block">Good quality, smaller size</span>
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="png" id="png" />
                    <Label htmlFor="png" className="flex-1">
                      <span className="font-medium">PNG</span>
                      <span className="text-sm text-gray-500 block">High quality, larger size</span>
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="webp" id="webp" />
                    <Label htmlFor="webp" className="flex-1">
                      <span className="font-medium">WebP</span>
                      <span className="text-sm text-gray-500 block">Modern format, good compression</span>
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              <Button onClick={handleSingleDownload} className="w-full">
                <Download className="w-4 h-4 mr-2" />
                Start Download
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="text-center">
                <h3 className="font-medium mb-2">Downloading Image...</h3>
                <Progress value={downloadProgress} className="w-full" />
                <p className="text-sm text-gray-500 mt-2">{Math.round(downloadProgress)}%</p>
              </div>

              <div className="flex items-center justify-center text-sm text-gray-500">
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Please wait while we prepare your image...
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Fullscreen Modal */}
      {fullscreenImage && (
        <div
          className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-4"
          onClick={closeFullscreen}
        >
          <Button
            variant="ghost"
            size="sm"
            className="absolute top-4 right-4 text-white hover:bg-white/20"
            onClick={closeFullscreen}
          >
            <X className="w-6 h-6" />
          </Button>
          <div className="max-w-full max-h-full" onClick={(e) => e.stopPropagation()}>
            <img
              src={fullscreenImage || "/placeholder.svg"}
              alt="Fullscreen view"
              className="max-w-full max-h-full object-contain"
              onError={(e) => {
                console.error(`Failed to load fullscreen image: ${fullscreenImage}`)
                e.target.src = "/placeholder.svg?height=400&width=400"
              }}
            />
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="bg-white border-t mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="mb-4 md:mb-0">
              <h3 className="text-lg font-semibold text-gray-900">Believers Community Church</h3>
              <p className="text-gray-600">God's platform for building men</p>
            </div>
            <div className="text-sm text-gray-500">© {new Date().getFullYear()} BCC Media. All rights reserved.</div>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default AlbumsPage
