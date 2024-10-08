package com.ssafy.ploud.domain.meeting.service;

import com.ssafy.ploud.domain.meeting.dto.MeetingInfo;
import com.ssafy.ploud.domain.meeting.dto.request.MeetingCreateRequest;
import com.ssafy.ploud.domain.meeting.dto.request.MeetingJoinRequest;
import com.ssafy.ploud.domain.meeting.dto.request.MeetingLeaveRequest;
import com.ssafy.ploud.domain.meeting.dto.request.MeetingSearchRequest;
import com.ssafy.ploud.domain.meeting.dto.response.MeetingInfoResponse;
import java.util.List;

public interface MeetingService {

    public List<MeetingInfo> list(MeetingSearchRequest request);

    public MeetingInfo detail(String sessionId);

    public MeetingInfoResponse create(MeetingCreateRequest request);

    MeetingInfoResponse join(MeetingJoinRequest request);

    MeetingInfo findBySessionId(String sessionId);

    void leave(MeetingLeaveRequest request);
}
