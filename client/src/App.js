import React, { useEffect, useRef, useState } from 'react';

function ShutterButton({ disabled, delay, onClick, onFinished }) {
    const [isClicked, setIsClicked] = useState(false);
    const [countdown, setCountdown] = useState(delay);

    useEffect(() => {
        let timer;

        if (isClicked) {
            timer = setInterval(() => {
                setCountdown((prevTime) => {
                    if (prevTime <= 1) {
                        clearInterval(timer);
                        setIsClicked(false);

                        onFinished();

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
            className="shutter-button ubuntu-bold"
            disabled={disabled}
        >
            {countdown}
        </button>
    );
}

function App() {
    const webcamVideoFeed = useRef();

    useEffect(() => {
        navigator.mediaDevices
            .getUserMedia({
                video: { width: 1080, height: 1920 },
                audio: false
            })
            .then((stream) => (webcamVideoFeed.current.srcObject = stream))
            .catch((e) => console.error(e));
    }, []);

    const [shutterDisabled, setShutterDisabled] = useState(false);

    return (
        <div onClick={() => document.documentElement.requestFullscreen()}>
            {/*<img
                src="seabears.png"
                style={{
                    position: 'absolute',
                    width: '10vh',
                    top: '2vh',
                    left: 'calc(50% - 5vh)'
                }}
            />*/}

            <main>
                <video
                    className="webcam-preview"
                    ref={webcamVideoFeed}
                    muted={true}
                    autoPlay={true}
                ></video>

                <div class="shutter-buttons">
                    <ShutterButton
                        delay={2}
                        onClick={() => setShutterDisabled(true)}
                        disabled={shutterDisabled}
                        onFinished={() => {
                            console.log('done');
                            setShutterDisabled(false);
                        }}
                    />
                    <ShutterButton
                        delay={10}
                        onClick={() => setShutterDisabled(true)}
                        disabled={shutterDisabled}
                        onFinished={() => {
                            console.log('done');
                            setShutterDisabled(false);
                        }}
                    />
                </div>
            </main>
        </div>
    );
}

export default App;
