import QRCode from 'qrcode';
import React, { useEffect, useRef, useState } from 'react';

const WEBCAM_WIDTH = 1920;
const WEBCAM_HEIGHT = 1080;

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
            className="button shutter-button ubuntu-bold"
            disabled={disabled}
        >
            {countdown}
        </button>
    );
}

function ShutterButtons(props) {
    return (
        <div className="shutter-buttons">
            <ShutterButton delay={2} {...props} />
            <ShutterButton delay={10} {...props} />
        </div>
    );
}

function App() {
    const webcamVideoFeed = useRef();
    const webcamCanvas = useRef();

    useEffect(() => {
        navigator.mediaDevices
            .getUserMedia({
                video: { width: WEBCAM_WIDTH, height: WEBCAM_HEIGHT },
                audio: false
            })
            .then((stream) => {
                const video = webcamVideoFeed.current;
                const canvas = webcamCanvas.current;

                video.addEventListener('loadedmetadata', () => {
                    canvas.width = video.videoWidth;
                    canvas.height = video.videoHeight;
                });

                video.srcObject = stream;
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

        setTimeout(() => {
            const canvas = webcamCanvas.current;

            canvas.width = webcamVideoFeed.current.videoWidth;
            canvas.height = webcamVideoFeed.current.videoHeight;

            canvas.style.width = 'auto';
            canvas.style.height = 'auto';

            const context = canvas.getContext('2d');
            context.drawImage(webcamVideoFeed.current, 0, 0);
        }, 300);
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

    return (
        <div onClick={() => document.documentElement.requestFullscreen()}>
            <main>
                <canvas
                    style={{ display: showPreview ? 'block' : 'none' }}
                    className="webcam-preview"
                    ref={webcamCanvas}
                ></canvas>
                <video
                    style={{ display: showPreview ? 'none' : 'block' }}
                    className="webcam-preview"
                    ref={webcamVideoFeed}
                    muted={true}
                    autoPlay={true}
                ></video>

                {showPreview ? (
                    <div className="shutter-buttons">
                        <button
                            className="button ubuntu-bold"
                            onClick={() => { setShowPreview(false) }}
                        >
                            Take Another
                        </button>

                        {isSaved ? (
                            ''
                        ) : (
                            <button
                                className="button ubuntu-bold"
                                onClick={savePhoto}
                            >
                                Save
                            </button>
                        )}
                    </div>
                ) : (
                    <ShutterButtons
                        onClick={() => setShutterDisabled(true)}
                        disabled={shutterDisabled}
                        onFinished={takePhoto}
                    />
                )}
            </main>

            <div
                className="flash"
                style={{ opacity: flash ? 1 : 0, pointerEvents: 'none' }}
            ></div>
        </div>
    );
}

export default App;
