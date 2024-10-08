package com.ssafy.ploud.domain.meeting.util;

import com.ssafy.ploud.common.exception.CustomException;
import com.ssafy.ploud.common.response.ResponseCode;
import com.ssafy.ploud.domain.meeting.dto.MeetingInfo;
import com.ssafy.ploud.domain.meeting.dto.request.MeetingCreateRequest;
import com.ssafy.ploud.domain.meeting.dto.request.MeetingJoinRequest;
import com.ssafy.ploud.domain.meeting.dto.response.MeetingInfoResponse;
import io.openvidu.java.client.ConnectionProperties;
import io.openvidu.java.client.ConnectionType;
import io.openvidu.java.client.OpenVidu;
import io.openvidu.java.client.OpenViduRole;
import io.openvidu.java.client.Session;
import jakarta.transaction.Transactional;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import lombok.Getter;
import lombok.extern.slf4j.Slf4j;
import org.aspectj.apache.bcel.classfile.Module.Open;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@Transactional
public class OpenViduUtil {
    private OpenVidu openVidu;
    private Map<String, Session> mapSessions = new ConcurrentHashMap<>();

    // session, token, role
    private Map<String, Map<String, OpenViduRole>> mapSessionIdsTokens = new ConcurrentHashMap<>();

    // 현재 생성중인 방
    @Getter
    private List<MeetingInfo> meetingList = new ArrayList<>();
    @Getter
    private Map<String, Boolean> sessionRecordings = new ConcurrentHashMap<>();

    @Autowired
    public OpenViduUtil(@Value("${openvidu.url}") String OPENVIDU_URL,
        @Value("${openvidu.secret}") String OPENVIDU_SECRET) {
        this.openVidu = new OpenVidu(OPENVIDU_URL, OPENVIDU_SECRET);
    }

    public Object join(MeetingJoinRequest request) {
        MeetingInfo meetingInfo = findBySessionId(request.getSessionId());

        // 인원 수 확인
        if (meetingInfo.getCurrentPeople() == meetingInfo.getMaxPeople()) {
            throw new CustomException(ResponseCode.ROOM_FULL);
        }
        // 비번 확인
        else if (meetingInfo.getIsPrivate() && !meetingInfo.getPassword()
            .equals(request.getPassword())) {
            throw new CustomException(ResponseCode.ROOM_PASSWORD_ERROR);
        }
        // 녹화 확인
        else if(meetingInfo.getSpeechId() != -1){
            throw new CustomException(ResponseCode.RECORD_PROCEEDING);
        }

        // 접속
        meetingInfo.setCurrentPeople(meetingInfo.getCurrentPeople() + 1);

        String serverData = "{\"serverData\": \"" + request.getUserId() + "\"}";
        OpenViduRole role = OpenViduRole.PUBLISHER;

        ConnectionProperties connectionProperties = new ConnectionProperties.Builder().type(
            ConnectionType.WEBRTC).data(serverData).role(role).build();

        try {
            String token = this.mapSessions.get(request.getSessionId())
                .createConnection(connectionProperties).getToken();

            String token2 = this.mapSessions.get(request.getSessionId())
                .createConnection(connectionProperties).getToken();

            this.mapSessionIdsTokens.get(request.getSessionId()).put(token, role);

            return new MeetingInfoResponse(meetingInfo, token, token2);
        } catch (Exception e) {
            throw new CustomException(ResponseCode.OPENVIDU_ERROR);
        }
    }

    public MeetingInfoResponse create(MeetingCreateRequest request) {
        // Connection 생성
        String serverData = "{\"serverData\": \"" + request.getManagerId() + "\"}";
        OpenViduRole role = OpenViduRole.PUBLISHER;

        ConnectionProperties connectionProperties = new ConnectionProperties.Builder().type(
            ConnectionType.WEBRTC).data(serverData).role(role).build();

        try {
            // Session 생성
            Session session = this.openVidu.createSession();
            String token = session.createConnection(connectionProperties).getToken();
            String token2 = session.createConnection(connectionProperties).getToken();

            String sessionId = session.getSessionId();

            // Data 관리
            this.mapSessions.put(sessionId, session);
            this.mapSessionIdsTokens.put(sessionId, new ConcurrentHashMap<>());
            this.mapSessionIdsTokens.get(sessionId).put(token, role);

            MeetingInfo meetingInfo = new MeetingInfo(sessionId, request);
            meetingList.add(meetingInfo);

            return new MeetingInfoResponse(meetingInfo, token, token2);
        } catch (Exception e) {
            throw new CustomException(ResponseCode.OPENVIDU_ERROR);
        }
    }

    public void leave(String sessionId, String token, Boolean isManager) {
        try{
            if (this.mapSessions.get(sessionId) != null
                && this.mapSessionIdsTokens.get(sessionId) != null) {
                if(this.mapSessionIdsTokens.get(sessionId).remove(token) != null){
                    MeetingInfo meetingInfo = findBySessionId(sessionId);
                    meetingInfo.setCurrentPeople(meetingInfo.getCurrentPeople() - 1);

                    if(isManager) {
                        log.debug("방 삭제 요청 - 세션 ID : " + sessionId);

                        this.mapSessionIdsTokens.remove(sessionId);
                        this.mapSessions.remove(sessionId);

                        for (int i = 0; i < meetingList.size(); ++i) {
                            if (meetingList.get(i).getSessionId().equals(sessionId)) {
                                log.debug("방 삭제 - 세션 ID : " + sessionId + ", 방장 : " + meetingInfo.getManagerId());

                                meetingList.remove(i);
                                break;
                            }
                        }
                    }
                } else{
                    throw new CustomException(ResponseCode.OPENBVIDU_TOKEN_ERROR);
                }
            }else{
                log.debug("OPENVIDU LEAVE SESSION - 세션을 찾을 수 없음.");
                // 방장이 종료하여 강제로 나가지는 경우 방장은 먼저 leavesSession하기 때문에 에러로 판단한다.
//                throw new CustomException(ResponseCode.SESSION_NOT_FOUND);
            }
        }catch (Exception e){
            throw new CustomException(ResponseCode.OPENVIDU_ERROR);
        }
    }

    public MeetingInfo findBySessionId(String sessionId) {
        for (MeetingInfo meetingInfo : meetingList) {
            if (meetingInfo.getSessionId().equals(sessionId)) {
                return meetingInfo;
            }
        }
        throw new CustomException(ResponseCode.SESSION_NOT_FOUND);
    }

    public int findSpeechIdBySessionId(String sessionId) {
        return findBySessionId(sessionId).getSpeechId();
    }
}
