import { useEffect, useCallback, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router";
import { debounce } from "lodash";
import Modal from "../../components/Modal";
import Button from "../../components/Button";
import StudyResult from "../StudyRoomPage/component/StudyResult";
import PracticeResult from "../PracticePage/PracticeResult";
import {
  startSpeech,
  endSpeech,
  assessSpeech,
  uploadVideo,
} from "../../services/speech";

const PracticeRoomPage = () => {
  const { token } = useSelector((state) => state.userReducer);
  const navigate = useNavigate();

  const location = useLocation();
  const scriptTitle = location.state.title;
  const content = location.state.content;
  const subject = location.state.subject;
  const object = location.state.object;
  const predicate = location.state.predicate;
  const category = location.state.category;

  const [feedback, setFeedback] = useState("[ 실시간 피드백 ]");

  const videoRef = useRef(null);
  const screenShareVideoRef = useRef(null);

  const [screenShare, setScreenShare] = useState(false);
  const [resultScreen, setResultScreen] = useState(false);
  const [screenStream, setScreenStream] = useState(null);

  const [title, setTitle] = useState("");
  const [recordForm, setRecordForm] = useState(false);
  const speechId = useRef(-1);

  const isRecording = useRef(false);
  const isLast = useRef(true);

  const [mediaRecorder, setMediaRecorder] = useState(null);

  const decibels = useRef([]);

  // 비디오 녹화 관련 함수
  const isVideoRecording = useRef(false);
  const videoChunksRef = useRef([]);
  const videoStartTime = useRef(null);

  const [stream, setStream] = useState(null);
  const [videoRecorder, setVideoRecorder] = useState(null);

  const [recordingTime, setRecordingTime] = useState(0);
  const [recordingInterval, setRecordingInterval] = useState(null);

  const [video, setVideo] = useState(true);
  const [mic, setMic] = useState(false);

  const [resultResponse, setResultResponse] = useState(false);
  const [videoResponse, setVideoResponse] = useState(null);

  // 피드백 관련
  const tmpDecibels = useRef([]); // 임시 데시벨 데이터 저장(3초)
  const isFeedback = useRef(false);
  const isFeedback2 = useRef(false);

  // 마이크 테스트 관련
  const [micTestContent, setMicTestContent] = useState("");

  // 데시벨 계산 후 추가하기
  const calcDecibel = (average) => {
    var decibel = Math.max(Math.round(38 * Math.log10(average)), 0);
    return decibel;
  };

  const addDecibel = (newDecibel) => {
    if (newDecibel !== 0) {
      decibels.current.push(newDecibel);
    }

    if (tmpDecibels.current.length >= 30) {
      tmpDecibels.current.shift();
    }
    tmpDecibels.current.push(newDecibel);

    // 3초 동안 30데시벨 이하
    const isSilent = tmpDecibels.current.every((db) => db < 30);

    if (!isFeedback.current && !isFeedback2.current && tmpDecibels.current.length >= 30 && isSilent) {
      isFeedback.current = true;
      changeFeedback("침묵이 길어지고 있어요!");
    } else if (!isFeedback.current && !isFeedback2.current && tmpDecibels.current.slice(-1)[0] >= 70) {
      isFeedback.current = true;
      changeFeedback("목소리가 너무 크게 들려요!");
    }
  };

  useEffect(() => {
    // 로직 작성
    // 평가 요청을 받았을 떄 속도가 빠르다, 발음 점수가 낮다.
    // 실시간 데시벨 측정으로 목소리 크기

    if (navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices
        .getUserMedia({ video: true, audio: true })
        .then((stream) => {
          videoRef.current.srcObject = stream;

          const vRecorder = new MediaRecorder(stream);
          setStream(stream);
          setVideoRecorder(vRecorder);

          vRecorder.ondataavailable = (e) => {
            if (e.data.size > 0) {
              // 주석해제하기
              videoUpload(e.data); // e.data : videoChunk
            }
          };
        })
        .catch((error) => {
          // console.log(error);
        });
    }

    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
        videoRef.current.srcObject = null;
      }

      if(!isLast.current){
        console.log("녹화 중 종료");
        speechEnd();
      }
    };
  }, []);

  const toggleVideo = () => {
    const newVideo = !video;
    setVideo(newVideo);

    if (stream) {
      stream.getVideoTracks().forEach((track) => {
        track.enabled = !track.enabled;
      });
    }
  };

  // 시작 버튼 누르면
  const speechStart = (e) => {
    e.preventDefault();

    const params = {
      title: title,
      personal: true,
      categoryId: category,
      sessionId: "",
    };

    startSpeech(
      token,
      params,
      (res) => {
        speechId.current = res.data.data.speechId;

        startRecording();
        videoRecordingStart();

        // 마이크 꺼짐
        setMic(false);
        setResultResponse(false);

        setFeedback("");
        setTimeout(() => {
          setFeedback("잘하고 있어요!");
        }, 1500)
      },
      (err) => {
        // console.log(err)
      } 
    );

    // 폼 변경
    setRecordForm(false);
  };

  // 녹화 종료 버튼 누르면
  const speechEnd = () => {
    isLast.current = true;
    // 녹화 중지 함수 실행
    stopRecording();
    videoRecordingEnd();

    endSpeech(
      token,
      {
        sessionId: "",
        speechId: speechId.current,
        decibels: decibels.current,
      },
      (response) => {
        // console.log(response);
      },
      (error) => {
        // console.log(error);
      }
    );

    // 비동기 처리 헷갈리니까 5초 뒤에 하자
    setTimeout(() => {
      recordResult();
    }, 5000);
  };

  const recordResult = () => {
    setResultScreen(true);
  };
  stream;
  // 평가 시작
  const startRecording = () => {
    isLast.current = false;
    isRecording.current = true;
    setRecordingTime(0);

    // recordTime 측정
    const interval = setInterval(() => {
      setRecordingTime((prevTime) => prevTime + 1);
    }, 1000);
    setRecordingInterval(interval);

    navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then((stream) => {
        const audioContext = new AudioContext();
        const source = audioContext.createMediaStreamSource(stream);
        const analyzer = audioContext.createAnalyser();
        analyzer.fftSize = 2048;
        source.connect(analyzer);

        const recorder = new MediaRecorder(stream);
        setMediaRecorder(recorder);

        // 녹음한 데이터를 upload한다.(서버에 전송한다.)
        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) {
            uploadAudio(e.data);
          }
        };

        // 녹음 중지, 중지 버튼을 누른게 아닌 경우 자동으로 다시 녹음 시작
        recorder.onstop = () => {
          stream.getTracks().forEach((track) => track.stop());
          if (isRecording.current) {
            startRecording(); // 자동으로 다시 녹음 시작
          }
        };

        recorder.start();

        // 데시벨 측정
        function analyzeAudio() {
          if (!isRecording.current) {
            return; // 녹음이 중지되면 분석 중지
          }

          const storedData = new Uint8Array(analyzer.frequencyBinCount);
          analyzer.getByteFrequencyData(storedData);

          let sum = 0;
          for (let i = 0; i < storedData.length; i++) {
            sum += storedData[i];
          }

          const average = sum / storedData.length;

          // 배열의 뒤에 추가
          addDecibel(calcDecibel(average));

          setTimeout(analyzeAudio, 100);
        }

        analyzeAudio();

        // 일정 주기마다 중지&재시작
        setTimeout(() => {
          if (recorder.state === "recording") {
            recorder.stop();
          }
        }, 5000);
      })
      .catch((error) => {
        console.error("오디오 스트림을 가져오는 중 오류 발생:", error);
      });
  };

  const changeFeedback = (fb) => {
    setFeedback(fb);

    setTimeout(() => {
      if(isFeedback2.current == true || (isFeedback.current == true && isFeedback2.current == false)){
        setFeedback("잘하고 있어요!");
      }

      setTimeout(() => {
        if(isFeedback.current == true){
          isFeedback.current = false;
        }else if(isFeedback2.current == true){
          isFeedback2.current = false;
        }
      }, 2500);
    }, 2500);
  };

  // 녹화 종료
  const stopRecording = () => {
    isRecording.current = false;
    if (mediaRecorder && mediaRecorder.state === "recording") {
      mediaRecorder.stop();
    }

    clearInterval(recordingInterval); // 타이머 중지

    // 타이머 상태를 null로 초기화하여 다음 녹음에 영향을 주지 않도록 함
    setRecordingInterval(null);
  };

  // 10초 평가 요청
  const uploadAudio = async (data) => {
    var tmp = [];
    tmp.push(data);

    const audioFile = new Blob(tmp, { type: "audio/wav" });
    const formData = new FormData();
    formData.append("audioFile", audioFile);
    formData.append("speechId", speechId.current);
    formData.append("isLast", isLast.current);

    assessSpeech(
      token,
      formData,
      (response) => {
        // console.log("음성 평가 결과");
        console.log(
          "개수 : " +
            response.data.data.scriptCnt +
            ", 점수 : " +
            response.data.data.score
        );

        // 실시간 피드백
        if (response.data.scriptCnt > 28) {
          changeFeedback("조금만 천천히 말해주세요!");
        } else if (response.data.score < 3) {
          changeFeedback("발음을 정확하게 해주세요!");
        }

        if(isLast.current){
          setResultResponse(true);
        }
      },
      (error) => {
        // console.log(error);
        if(isLast.current){
          setResultResponse(true);
        }
      }
    );

    if(isLast.current){
      setFeedback("[ 실시간 피드백 ]");
    }
  };

  // 비디오 녹화 시작
  const videoRecordingStart = () => {
    if (videoRecorder) {
      isVideoRecording.current = true;
      videoChunksRef.current = [];
      videoStartTime.current = new Date().getTime();

      videoRecorder.start();
    }
  };

  // 비디오 녹화 종료 함수
  const videoRecordingEnd = () => {
    isVideoRecording.current = false;

    if (videoRecorder && videoRecorder.state === "recording") {
      videoRecorder.stop();
    }
  };

  // 영상 보내기
  const videoUpload = (data) => {
    var tmp = [];
    tmp.push(data);

    var videoPlayTime = new Date().getTime() - videoStartTime.current;

    const videoFile = new Blob(tmp, { type: "video/webm" });
    const vFormData = new FormData();
    vFormData.append("video", videoFile);
    vFormData.append("speechId", speechId.current);
    vFormData.append("speechTimeInSeconds", videoPlayTime);

    uploadVideo(
      token,
      vFormData,
      (response) => {
        // console.log("영상 업로드 성공");
        setVideoResponse(true);
      },
      (error) => {
        // console.log("영상 업로드 실패");
        setVideoResponse(false);
      }
    );
  };

  // 화면 공유 시작
  const startScreenShare = async () => {
    setScreenShare(true);
    navigator.mediaDevices
      .getDisplayMedia({ video: true })
      .then((screenStream) => {
        screenShareVideoRef.current.srcObject = screenStream;
        setScreenStream(screenStream);

        screenStream.getVideoTracks()[0].onended = () => {
          stopScreenShare();
        };
      })
      .catch((err) => console.error("화면 공유 오류: ", err));
  };

  // 화면 공유 종료
  const stopScreenShare = async () => {
    setScreenShare(false);
    if (screenStream) {
      screenStream.getTracks().forEach((track) => track.stop());
      screenShareVideoRef.current.srcObject = null;
    }
  };

  // 결과 창 닫기
  const handleResultClose = () => {
    setResultScreen(false);
    setResultResponse(false);
    speechId.current = -1;
  };

  const leaveSession = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
    navigate("/practice1");
  };

  const [micColor, setMicColor] = useState("green");
  const [micStream, setMicStream] = useState(null);
  const micTestRef = useRef(false);

  useEffect(() => {
    const startMicTest = async () => {
      micTestRef.current = true;

      navigator.mediaDevices
        .getUserMedia({ audio: true })
        .then((mStream) => {
          const micAudioContext = new AudioContext();
          const micSource = micAudioContext.createMediaStreamSource(mStream);
          const micAnalyzer = micAudioContext.createAnalyser();
          micAnalyzer.fftSize = 2048;
          micSource.connect(micAnalyzer);

          setMicStream(mStream);

          function analyzeMicAudio() {
            if (!micTestRef.current) {
              return;
            }

            const micStoredData = new Uint8Array(micAnalyzer.frequencyBinCount);
            micAnalyzer.getByteFrequencyData(micStoredData);

            let micSum = 0;
            for (let i = 0; i < micStoredData.length; i++) {
              micSum += micStoredData[i];
            }

            const micAverage = micSum / micStoredData.length;

            const micDecibel = calcDecibel(micAverage);

            if (micDecibel < 30) {
              setMicTestContent("목소리가 거의 들리지 않아요!");
              setMicColor("red");
            } else if (micDecibel <= 55) {
              setMicTestContent("조금만 크게 말해주세요!");
              setMicColor("orange");
            } else if (micDecibel <= 65) {
              setMicTestContent("목소리의 크기가 적당해요!");
              setMicColor("green");
            } else if (micDecibel < 75) {
              setMicTestContent("조금만 작게 말해주세요!");
              setMicColor("orange");
            } else {
              setMicTestContent("목소리가 너무 크게 들려요!");
              setMicColor("red");
            }

            setTimeout(analyzeMicAudio, 100);
          }

          analyzeMicAudio();
        })
        .catch((error) => {
          // console.log("마이크 테스트 에러");
        });
    };

    const stopMicTest = () => {
      micTestRef.current = false;

      // if (micAudioContext) micAudioContext.close();
      if (micStream) micStream.getTracks().forEach((track) => track.stop());
      setMicTestContent("");
    };

    if (mic) {
      // console.log("마이크 테스트 시작");
      startMicTest();
    } else {
      // console.log("마이크 테스트 종료");
      stopMicTest();
    }

    return () => {
      stopMicTest();
    };
  }, [mic]);

  const toggleMic = () => {
    setMic(!mic); // 상태 업데이트
  };

  // 서술어를 가린다 (. 포함하는 word 가림)
  const wrapWords = (text) => {
    const words = text.split(" ");
    return words.map((word, index) => (
      <span key={index} className="word">
        {(predicate === "1" && word.includes(".")) ||
        (object === "1" && (word.endsWith("을") || word.endsWith("를"))) ||
        (subject === "1" &&
          (word.endsWith("은") ||
            word.endsWith("는") ||
            word.endsWith("이") ||
            word.endsWith("에서") ||
            word.endsWith("께서") ||
            word.endsWith("가"))) ? (
          <span className="blur-text">{word + " "}</span>
        ) : (
          <>
            {word} <></>
          </>
        )}
      </span>
    ));
  };

  return (
    <div className="RoomPage">
      <div className="roompage-icon">
        <img src="/images/ploud_icon_bg.png" />
      </div>
      <div className="PracticeRoomPage-mid">
        <div
          style={{
            width: "50%",
            height: "600px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          <div>
            <video
              style={{ width: "530px", height: "500px" }}
              ref={videoRef}
              autoPlay
              muted
            />
          </div>
          <div
            style={{
              width: "500px",
              margin: "30px",
              height: "100px",
              borderRadius: "10px",
              backgroundColor: "#444A78",
              textAlign: "center",
              fontSize: "24px",
              fontWeight: "bold",
              color: "white",
              marginTop: "-20px",
              paddingTop: "26px",
            }}
          >
            {feedback}
          </div>
        </div>
        {screenShare ? (
          <div
            style={{
              width: "50%",
              height: "600px",
              display: "flex",
            }}
          >
            <div>
              <video
                ref={screenShareVideoRef}
                style={{
                  minWidth: "530px",
                  minHeight: "500px",
                  maxWidth: "800px",
                  maxHeight: "600px",
                  padding: "22px",
                }}
                autoPlay
              ></video>
            </div>
          </div>
        ) : content != "" ? (
          <div className="script-box">
            <p
              style={{
                fontSize: "20px",
                fontWeight: "bold",
                textAlign: "center",
                marginBottom: "23px",
              }}
            >
              {scriptTitle}
            </p>
            {wrapWords(content)}
          </div>
        ) : null}
      </div>

      {/* Bottom - 버튼 */}
      <div className="RoomPage-bottom" style={{ justifyContent: "center" }}>
        <div className="flex items-center space-x-16">
          {mic ? (
            <img onClick={toggleMic} src="/images/mictestbutton.png" />
          ) : (
            <img onClick={toggleMic} src="/images/mictestbutton_disabled.png" />
          )}
          {!isLast.current ? (
            <img onClick={speechEnd} src="/images/recordbutton_activated.png" />
          ) : !recordForm ? (
            <img
              onClick={(e) => {
                setRecordForm(!recordForm);
                setMic(false);
              }}
              src="/images/recordbutton.png"
            />
          ) : (
            <img
              onClick={(e) => {
                setRecordForm(!recordForm);
              }}
              src="/images/recordbutton_disabled.png"
            />
          )}
          {video ? (
            <img onClick={toggleVideo} src="/images/videobutton.png" />
          ) : (
            <img onClick={toggleVideo} src="/images/videobutton_disabled.png" />
          )}
          {screenShare === false ? (
            <img onClick={startScreenShare} src="/images/sharebutton.png" />
          ) : (
            <img
              onClick={stopScreenShare}
              src="/images/sharebutton_disabled.png"
            />
          )}
          <img onClick={leaveSession} src="/images/exitbutton.png" alt="" />
        </div>
      </div>

      {/* 마이크 테스트 폼 */}
      {mic && (
        <Modal
          title="마이크테스트"
          onClose={(e) => setMic(false)}
          className={"mic-test-form"}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              flexDirection: "column",
              alignItems: "center",
            }}
          >
            <p className="mic-text-box">{micTestContent}</p>
            <div
              className="mic-color-box"
              style={{
                backgroundColor: micColor,
              }}
            ></div>
          </div>
        </Modal>
      )}

      {/* 녹화 폼 */}
      {recordForm && (
        <Modal
          title="녹화 정보 입력"
          onClose={(e) => setRecordForm(false)}
          className={"record-form"}
        >
          <form onSubmit={speechStart}>
            <div>
              <p>
                제목 :
                <input
                  placeholder="제목 입력..."
                  value={title}
                  style={{ color: "white" }}
                  onChange={(e) => setTitle(e.target.value)}
                ></input>
              </p>
              <p>카테고리 : 전체</p>
              <p>분류 : 개인</p>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end" }}></div>
            <Button>녹화 시작</Button>
          </form>
        </Modal>
      )}
      {/* 녹화 결과 폼 */}
      {resultScreen && (
        // <StudyResult onClose={handleResultClose} speechId={speechId.current} />
        <PracticeResult
          onClose={handleResultClose}
          speechId={speechId.current}
          videoResponse={videoResponse}
          resultResponse={resultResponse}
        />
      )}
    </div>
  );
};

export default PracticeRoomPage;
