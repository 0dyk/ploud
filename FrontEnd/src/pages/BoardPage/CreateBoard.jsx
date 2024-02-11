import { useSelector,useDispatch } from "react-redux";
import React, { useEffect, useState } from "react";
import Footer from "../../components/Footer";
import Navbar from "../../components/Navbar";
import Page from "../../components/Page";
import { Link, useNavigate, useLocation } from "react-router-dom";
import Modal from "react-modal";
import { createboard, getboardDetail, putboard } from "../../services/board";
import { userVideos } from "../../services/user";
// import { refreshAccessToken, updateNickname } from "../../features/user/userSlice";


const CreateBoard = () => {
  // 로직
  const navigate = useNavigate();
  const token  = useSelector((state) => state.userReducer.token);
  const [ isModalOpen, setIsModalOpen ] = useState(false);
  const [ userVideoList, setUserVideoList ] = useState([])
  const [ isSelectedVideo, setIsSelectedVideo ] = useState(false)
  const [ selectedVideoTitle, setSelectedVideoTitle ] = useState("");
  const [ postVideoId, setPostVideoId] = useState(0)
  const location = useLocation();
  const isCreate = location.state.isCreate;
  const boardId = location.state.boardId;
  const [ pastTitle, setPastTitle ] = useState('')
  const [ pastContent, setPastContent ] = useState('')

  
  const [formData, setFormData] = useState({
    title: "", 
    content: "",
  });

  useEffect(() => {
    console.log(isCreate);
    console.log(boardId);
    const getData = async () => {
      try {
        const videosResponse = await userVideos(
          token,
          (res) => {
            console.log(res)
            console.log(res.data.data);
            setUserVideoList(res.data.data);
          },
          (err) => console.log(err)
        );
  
        if (!isCreate) { // 수정 모드인 경우
          const boardDetailResponse = await getboardDetail(
            token,
            boardId,
            (res) => {
              console.log(res);
              setPastTitle(res.data.data.title)
              setPastContent(res.data.data.content)              
            },
            (err) => console.log(err)
          );
        }
      } catch (error) {
        console.log(error);
      }
    };
    getData();
  }, []);

  useEffect(() => {
    if (!isCreate) { // 수정 모드인 경우
      setFormData({
        title: pastTitle,
        content: pastContent,
      });
    }
  }, [pastTitle, pastContent, isCreate]);
 
  const handleOpenModal = () => {
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handlePut = (e) => {
    const inputData = {
      title: formData.title,
      content: formData.content,
      videoId: postVideoId
    }
    if (formData.title === "" || formData.content === "" || postVideoId==0) {
      alert("제목과 내용과 영상을 모두 입력해주세요.");
    } else {
      putboard(
        token,
        boardId,
        inputData,
        (res) => {
          navigate('/board')
        },
        (err) => {
          console.log(videoId)
          console.error(err);
        }
      );
    }
  }


  const handleSubmit = (e) => {
    e.preventDefault();
    
    const inputData = {
      title: formData.title,
      content: formData.content,
      videoId: postVideoId
    }
  
    if (formData.title === "" || formData.content === "" || postVideoId==0) {
      alert("제목과 내용과 영상을 모두 입력해주세요.");
    } else {
      createboard(
        token,
        inputData, 
        (response) => {
          navigate('/board')
        }, 
        (error) => {
          console.log(error);
        }
      )
    }
  }
  

  const formatDate = (date) => {
    const year = date.substr(0,2);
    const month = date.substr(2,2);
    const day = date.substr(4,2);

    return `${year}년 ${month}월 ${day}일`;
  }

  const handleVideoSelect = (video) => {
    setPostVideoId(video.videoId);
    setSelectedVideoTitle(video.title);
    setIsSelectedVideo(true)
    setIsModalOpen(false)
  };


  return (
      <div className="mypage bg-white w-full min-h-screen">
      <Page header={<Navbar />} footer={<Footer />}>
        <div className="flex justify-center w-full mt-24">
          <div className="creBoaOut">
            <div className="text-center">
              <h2 className="font-extrabold text-2xl">게시글 작성</h2>
            </div>
          <div className=" border-2 border-black mx-20 px-10 my-5 rounded-xl">
            <div className="mt-5 mb-2 text-xl">제목</div>
            <div>
              {isCreate&&<input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleChange}
                className="block w-full rounded-md border-0 py-1 pl-5 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                />}
              {!isCreate&&<input
                type="text"
                name="title"
                defaultValue={pastTitle}
                onChange={handleChange}
                className="block w-full rounded-md border-0 py-1 pl-5 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                />}
            </div>
            <div className="mt-5 mb-2 text-xl">내용</div>
            <div className=" border rounded-md mb-10">
            <div className="flex">
              <button className="bg-white h-7" onClick={handleOpenModal}><img src="images/createBoard.png" className="h-full pl-2"/> </button>
              {isSelectedVideo&&<div className="pt-0.5">선택된 동영상 : {selectedVideoTitle}</div>}
            </div>
            <Modal className="createmodal" isOpen={isModalOpen} onRequestClose={handleCloseModal} ariaHideApp={false}>
              <div className="text-center text-2xl font-bold">발표 선택</div>
              <ul>
                {userVideoList.map((video, index) => (
                  <li key={index} className="grid grid-col-12 text-center px-5 py-2 my-5 modalList" onClick={() =>handleVideoSelect(video)}>
                    <div className="col-4 mx-2 text-xl font-bold">{video.title}</div>
                    <div className="col-2 mx-2 pt-0.5">{video.playTime}분</div>
                    <div className="col-6 pt-1 text-sm ">{formatDate(video.recordTime)}</div>
                  </li>
                ))}
              </ul>
            </Modal>
            {isCreate&&<textarea
              name="content"
              value={formData.content}
              onChange={handleChange}
              className=" block w-full h-80 border-0 py-1 pl-5 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
            />}
            {!isCreate&&<textarea
              name="content"
              defaultValue={pastContent}
              onChange={handleChange}
              className=" block w-full h-80 border-0 py-1 pl-5 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
            />}
            </div>
          </div>
          <div className="createBtn px-60">
        {isCreate&&<button onClick={handleSubmit} className="border writeBtn rounded-md py-1 px-4 mx-10">등록</button>}
        {!isCreate&&<button onClick={handlePut} className="border writeBtn rounded-md py-1 px-4 mx-10">수정</button>}
        <button className="border writeBtn1 rounded-md py-1 px-4 mx-10"><Link to={"/board"}>취소</Link></button>
          </div>
          </div>
        </div>
      </Page>
    </div>
  );
};

export default CreateBoard;