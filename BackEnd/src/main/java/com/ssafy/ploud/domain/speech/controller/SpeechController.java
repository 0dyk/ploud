package com.ssafy.ploud.domain.speech.controller;

import com.ssafy.ploud.common.exception.CustomException;
import com.ssafy.ploud.common.response.ApiResponse;
import com.ssafy.ploud.common.response.ResponseCode;
import com.ssafy.ploud.domain.speech.dto.request.CommentRequest;
import com.ssafy.ploud.domain.speech.dto.request.FeedbackRequest;
import com.ssafy.ploud.domain.speech.dto.request.SpeechEndRequest;
import com.ssafy.ploud.domain.speech.dto.request.SpeechStartRequest;
import com.ssafy.ploud.domain.speech.dto.request.VideoUploadRequest;
import com.ssafy.ploud.domain.speech.dto.response.ClearityResponse;
import com.ssafy.ploud.domain.speech.service.SpeechService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.Arrays;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.parameters.P;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@Tag(name = "스피치 평가 API", description = "스피치 평가 관련 API")
@RestController
@SecurityRequirement(name = "Bearer Authentication")
@RequiredArgsConstructor
@RequestMapping("/api/speech")
@Slf4j
public class SpeechController {

    private final SpeechService speechService;

    @Operation(summary = "녹화 시작", description = "녹화 시작이 가능한 경우 speechId를 반환한다.")
    @PostMapping("/start")
    public ApiResponse<?> startSpeech(@AuthenticationPrincipal UserDetails loginUser,
        @RequestBody SpeechStartRequest speechStartRequest) {
        log.debug("---------- 녹화 시작 요청 ----------");
        log.debug("UserID : " + loginUser.getUsername() + " , SessionID : " + speechStartRequest.getSessionId()
        + ", Title : " + speechStartRequest.getTitle());

        speechStartRequest.setUserId(loginUser.getUsername());
        return ApiResponse.ok("성공", speechService.start(speechStartRequest));
    }

    @Operation(summary = "녹화 종료", description = "녹화를 종료하고, 데시벨 평가를 진행한다.")
    @PostMapping("/end")
    public ApiResponse<?> endSpeech(@RequestBody SpeechEndRequest speechEndRequest) {
        log.debug("---------- 녹화 종료 요청 ----------");
        log.debug("SessionId : " + speechEndRequest.getSessionId() +", SpeechID : " + speechEndRequest.getSpeechId());
        speechService.endAndDecibel(speechEndRequest);
        return ApiResponse.ok("성공");
    }

    @Operation(summary = "영상 업로드", description = "녹화된 영상을 업로드한다")
    @PostMapping(value = "/video", consumes = {MediaType.APPLICATION_JSON_VALUE,
        MediaType.MULTIPART_FORM_DATA_VALUE})
    public ApiResponse<?> uploadSpeechVideo(@AuthenticationPrincipal UserDetails loginUser,
        @ModelAttribute VideoUploadRequest videoUploadRequest) {
        if (loginUser == null) {
            throw new CustomException(ResponseCode.USER_LOGIN_RERQUIRED);
        }
        System.out.println("controller "+videoUploadRequest.getSpeechId()+", "+ videoUploadRequest.getSpeechTimeInSeconds());
        speechService.uploadVideo(videoUploadRequest, loginUser.getUsername());
        return ApiResponse.ok("영상 업로드 완료");
    }

    @Operation(summary = "명료도, 발화속도 평가", description = "ETRI로 API 요청을 보내고 score 점수를 반환한다.")
    @PostMapping("/assess")
    public ApiResponse<?> assessClearity(@RequestParam("audioFile") MultipartFile audioFile,
        @RequestParam("speechId") int speechId,
        @RequestParam("isLast") Boolean isLast) {
        log.debug("---------- 명료도 평가 요청 ----------");
        log.debug("SessionId : " + speechId + ", isLast : " + isLast);

        return ApiResponse.ok("성공", speechService.clearity(audioFile, speechId, isLast));
    }

    @Operation(summary = "피드백 등록", description = "스피치에 대한 (익명)피드백을 등록한다.")
    @PostMapping("/fb")
    public ApiResponse<?> startSpeech(@AuthenticationPrincipal UserDetails loginUser,
        @RequestBody FeedbackRequest feedbackRequest) {
        log.debug("---------- 피드백 등록 요청 ----------");
        log.debug("UserID, " + loginUser.getUsername() + ", SessionId : " + feedbackRequest.getSessionId() +
            ", Content : " + feedbackRequest.getContent());

        feedbackRequest.setUserId(loginUser.getUsername());
        speechService.feedback(feedbackRequest);
        return ApiResponse.ok("성공");
    }

    @Operation(summary = "개인 코멘트 등록", description = "스피치가 종료된 후 개인 코멘트를 등록한다.")
    @PostMapping("/comment")
    public ApiResponse<?> startSpeech(@RequestBody CommentRequest commentRequest) {
        log.debug("---------- 코멘트 등록 요청 ----------");
        log.debug("SpeechID : " + commentRequest.getSpeechId() + ", Comment : " + commentRequest.getComment());

        speechService.comment(commentRequest);
        return ApiResponse.ok("성공");
    }

    @Operation(summary = "누적 발표 개수 조회", description="모든 스피치 개수를 조회한다")
    @GetMapping("/count")
    public ApiResponse<?> getAllSpeechCount() {
        return ApiResponse.ok("누적 발표 개수 조회 성공", speechService.findAllSpeechCount());
    }
}
