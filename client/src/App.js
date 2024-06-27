// TODO setTimeout after photo taken

import QRCode from 'qrcode';
import React, { useEffect, useRef, useState, useCallback } from 'react';

import frameImage from './frame.png';
import seabearsImage from './seabears-logo.webp';
import takeYourShotImage from './take-your-shot.png';
import shutterButtonImage from './shutter-button.png';
import zueikeImage from './zueike.png';
import ondisplayImage from './ondisplay.png';

const WEBCAM_WIDTH = 1920;
const WEBCAM_HEIGHT = 1080;

// amount of time to wait before going back to main preview
const TIMEOUT = 15000;

function formatDate(date) {
    const day = date.getDate();
    const year = date.getFullYear();

    const monthName = new Intl.DateTimeFormat('en-US', {
        month: 'long'
    }).format(date);

    const ordinalSuffix = (n) => {
        if (n > 3 && n < 21) {
            return 'th';
        }

        switch (n % 10) {
            case 1:
                return 'st';
            case 2:
                return 'nd';
            case 3:
                return 'rd';
            default:
                return 'th';
        }
    };

    return `${monthName} ${day}${ordinalSuffix(day)} ${year}`;
}

function ShutterButton({ disabled, delay, onClick, onFinished }) {
    const [isClicked, setIsClicked] = useState(false);
    const [countdown, setCountdown] = useState(delay);

    useEffect(() => {
        if (countdown <= 1) {
            setTimeout(() => onFinished(), 1000);
        }
    }, [countdown, onFinished]);

    useEffect(() => {
        let timer;

        if (isClicked) {
            timer = setInterval(() => {
                setCountdown((prevTime) => {
                    if (prevTime <= 1) {
                        clearInterval(timer);
                        setIsClicked(false);

                        return delay;
                    }

                    return prevTime - 1;
                });
            }, 1000);
        }

        return () => clearInterval(timer);
    }, [isClicked, delay]);

    return (
        <button
            onClick={() => {
                onClick();
                setIsClicked(true);
            }}
            className="shutter-button"
            disabled={disabled}
        >
            {!isClicked ? (
                <img
                    className="breathe"
                    src={shutterButtonImage}
                    style={{ width: '100%' }}
                    alt="Shoot Now"
                />
            ) : (
                `${countdown}...`
            )}
        </button>
    );
}

function App() {
    const timeout = useRef(0);

    const webcamVideoFeed = useRef();
    const webcamCanvas = useRef();

    const updateCanvasSize = () => {
        const video = webcamVideoFeed.current;
        const canvas = webcamCanvas.current;

        const canvasSize = Math.min(video.videoWidth, video.videoHeight);

        canvas.width = canvasSize;
        canvas.height = canvasSize;

        canvas.style.width = '80vw';
        canvas.style.height = 'auto';
    };

    const requestCamera = () => {
        navigator.mediaDevices
            .getUserMedia({
                video: { width: WEBCAM_WIDTH, height: WEBCAM_HEIGHT },
                audio: false
            })
            .then((stream) => {
                const video = webcamVideoFeed.current;
                video.srcObject = stream;
                video.addEventListener('loadedmetadata', updateCanvasSize);

                // re-request feed if ended
                stream.getVideoTracks()[0].onended = () => {
                    requestCamera();
                };
            })
            .catch((e) => console.error(e));
    };


    useEffect(() => {
        requestCamera();

        // prevent user from dragging on kiosk
        document.addEventListener('touchmove', (e) => e.preventDefault(), {
            passive: false
        });
    }, []);

    const [shutterDisabled, setShutterDisabled] = useState(false);
    const [flash, setFlash] = useState(false);
    const [showPreview, setShowPreview] = useState(false);
    const [isSaved, setIsSaved] = useState(false);

    const updateTimeout = () => {
        clearTimeout(timeout.current);

        timeout.current = setTimeout(() => {
            updateCanvasSize();

            setIsSaved(false);
            setShowPreview(false);
        }, TIMEOUT);
    };

    const takePhoto = () => {
        setFlash(true);

        setTimeout(() => {
            setFlash(false);
            setShutterDisabled(false);
            setShowPreview(true);

            updateTimeout();
        }, 800);
    };

    const [isSaving, setIsSaving] = useState(false);

    const savePhoto = () => {
        setIsSaving(true);

        webcamCanvas.current.toBlob(async (blob) => {
            const formData = new FormData();
            formData.append('file', blob, 'photo.jpg');

            const res = await fetch(
                `${process.env.REACT_APP_API_URL}upload?secret=hi`,
                {
                    method: 'post',
                    body: formData
                }
            );

            try {
                const { uuid } = await res.json();

                QRCode.toCanvas(
                    webcamCanvas.current,
                    `${process.env.REACT_APP_API_URL}submit/${uuid}`,
                    { scale: 14 },
                    (err) => {
                        if (err) {
                            console.error(err);
                        }

                        setIsSaved(true);

                        updateTimeout();
                    }
                );
            } catch (e) {
                console.error(e);
            }

            setIsSaving(false);
        }, 'image/jpeg');
    };

    const requestRef = useRef();
    const previousTimeRef = useRef();
    const imageRef = useRef();

    useEffect(() => {
        const image = new Image();
        image.onload = () => (imageRef.current = image);
        image.src = frameImage;
    }, []);

    const animate = useCallback((time) => {
        const canvas = webcamCanvas.current;
        const video = webcamVideoFeed.current;

        if (previousTimeRef.current !== undefined) {
            const context = canvas.getContext('2d');

            // move feed down to make room for frame
            const frameOffset = canvas.height * 0.0375;

            context.drawImage(
                video,
                0,
                video.videoHeight - canvas.height,
                video.videoWidth,
                canvas.height - frameOffset,
                frameOffset,
                frameOffset,
                canvas.width - frameOffset * 2,
                canvas.height - frameOffset * 2
            );

            if (imageRef.current) {
                context.drawImage(
                    imageRef.current,
                    0,
                    0,
                    canvas.width,
                    canvas.height
                );
            }

            context.textAlign = 'center';

            context.font = `${Math.round(canvas.height * 0.05)}px Knockout`;

            context.fillStyle = '#fff';

            context.fillText(
                'OTTAWA VS WINNIPEG',
                canvas.width / 2,
                canvas.height - canvas.height * 0.04
            );

            context.font = `${Math.round(canvas.height * 0.03)}px Knockout`;

            context.fillText(
                formatDate(new Date()),
                canvas.width / 2,
                canvas.height - Math.round(canvas.height * 0.008)
            );
        }

        previousTimeRef.current = time;
        requestRef.current = requestAnimationFrame(animate);
    }, []);

    useEffect(() => {
        if (!showPreview) {
            requestRef.current = requestAnimationFrame(animate);
        }

        return () => cancelAnimationFrame(requestRef.current);
    }, [showPreview, animate]);

    return (
        <div
            onClick={() => {
                try {
                    //document.documentElement.requestFullscreen();
                } catch (e) {
                    console.error(e);
                }
            }}
        >
            <div className="background"></div>

            <header className="header">
                <img className="logo" src={seabearsImage} alt="Seabears logo" onclick={() => requestCamera()}/>
                <img
                    src={takeYourShotImage}
                    alt="Take Your Shot"
                    style={{
                        alignSelf: 'center',
                        width: '35vw'
                    }}
                />
            </header>

            <main className="main-content">
                {isSaved ? <h2>Save Your Shot</h2> : ''}

                <canvas className="webcam-preview" ref={webcamCanvas}></canvas>

                <div className="aside-wrap">
                    {showPreview ? (
                        <div className="save-buttons">
                            <button
                                className="button"
                                onClick={() => {
                                    setShowPreview(false);
                                    setIsSaved(false);

                                    updateCanvasSize();
                                }}
                                disabled={isSaving}
                            >
                                Shoot Again
                            </button>

                            {isSaved ? (
                                ''
                            ) : (
                                <button
                                    className="button"
                                    onClick={savePhoto}
                                    disabled={isSaving}
                                >
                                    Save
                                </button>
                            )}
                        </div>
                    ) : (
                        <div className="instructions">
                            <p>
                                <span style={{ marginRight: '6vw' }}>
                                    1. Shoot Your Photo
                                </span>
                                2. Join The Newsletter
                                <br />
                                3. Share on Social Media
                            </p>

                            <ShutterButton
                                delay={5}
                                onClick={() => setShutterDisabled(true)}
                                disabled={shutterDisabled}
                                onFinished={takePhoto}
                            />
                        </div>
                    )}
                </div>
            </main>

            <footer className="footer">
                <img
                    className="footer-image"
                    src={zueikeImage}
                    alt="Zueiki logo"
                />
                <div>Powered By</div>
                <img
                    className="footer-image"
                    src={ondisplayImage}
                    alt="ondisplay logo"
                />
            </footer>

            <video
                style={{ visibility: 'hidden', width: 0, height: 0 }}
                ref={webcamVideoFeed}
                muted={true}
                autoPlay={true}
            ></video>

            <div
                className="flash"
                style={{ opacity: flash ? 1 : 0, pointerEvents: 'none' }}
            ></div>
        </div>
    );
}

export default App;
