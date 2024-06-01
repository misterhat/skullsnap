// TODO setTimeout after photo taken

import QRCode from 'qrcode';
import React, { useEffect, useRef, useState, useCallback } from 'react';

import frameImage from './frame.png';
import seabearsImage from './seabears-logo.webp';
import takeYourShotImage from './take-your-shot.png';
import instructionsImage from './instructions.png';
import shutterButtonImage from './shutter-button.png';

const WEBCAM_WIDTH = 1920;
const WEBCAM_HEIGHT = 1080;

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
            {countdown === delay ? (
                <img
                    className="breathe"
                    src={shutterButtonImage}
                    style={{ width: '100%' }}
                />
            ) : (
                `${countdown}...`
            )}
        </button>
    );
}

function App() {
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

    useEffect(() => {
        navigator.mediaDevices
            .getUserMedia({
                video: { width: WEBCAM_WIDTH, height: WEBCAM_HEIGHT },
                audio: false
            })
            .then((stream) => {
                const video = webcamVideoFeed.current;
                video.srcObject = stream;
                video.addEventListener('loadedmetadata', updateCanvasSize);
            })
            .catch((e) => console.error(e));
    }, []);

    const [shutterDisabled, setShutterDisabled] = useState(false);
    const [flash, setFlash] = useState(false);
    const [showPreview, setShowPreview] = useState(false);
    const [isSaved, setIsSaved] = useState(false);

    const takePhoto = () => {
        setFlash(true);

        setTimeout(() => {
            setFlash(false);
            setShutterDisabled(false);
            setShowPreview(true);
        }, 800);
    };

    const savePhoto = () => {
        webcamCanvas.current.toBlob(async (blob) => {
            const formData = new FormData();
            formData.append('file', blob, 'photo.jpg');

            const res = await fetch('http://172.30.6.158:5000/upload', {
                method: 'post',
                body: formData
            });

            const { file } = await res.json();

            QRCode.toCanvas(
                webcamCanvas.current,
                `http://172.30.6.158:5000/${file}`,
                { scale: 10 },
                (err) => {
                    if (err) {
                        console.error(err);
                    }

                    setIsSaved(true);
                }
            );
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
        <div onClick={() => document.documentElement.requestFullscreen()}>
            <div className="background"></div>

            <header className="header">
                <img className="logo" src={seabearsImage} alt="Seabears logo" />
                <img
                    src={takeYourShotImage}
                    alt="Take Your Shot"
                    style={{
                        alignSelf: 'center'
                    }}
                />
            </header>

            <main className="main-content">
                <canvas className="webcam-preview" ref={webcamCanvas}></canvas>

                {showPreview ? (
                    <div className="save-buttons">
                        <button
                            className="button"
                            onClick={() => {
                                setShowPreview(false);
                                setIsSaved(false);

                                updateCanvasSize();
                            }}
                        >
                            Shoot Again
                        </button>

                        {isSaved ? (
                            ''
                        ) : (
                            <button className="button" onClick={savePhoto}>
                                Save
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="save-buttons">
                        <img
                            src={instructionsImage}
                            alt="Instructions"
                            style={{
                                alignSelf: 'center',
                                width: '35vw',
                                marginRight: '8vw'
                            }}
                        />
                        <ShutterButton
                            delay={6}
                            onClick={() => setShutterDisabled(true)}
                            disabled={shutterDisabled}
                            onFinished={takePhoto}
                        />
                    </div>
                )}
            </main>

            <footer className="footer"></footer>

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
