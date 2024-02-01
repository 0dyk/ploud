import { configureStore } from '@reduxjs/toolkit'
import { combineReducers } from 'redux';
import storage from 'redux-persist/lib/storage';
import { persistReducer } from 'redux-persist';
import userReducer from '../features/user/userSlice'
import signUpReducer from '../features/user/signUpSlice'
import studyReducer from '../features/study/studySlice'

const reducers = combineReducers({
  // 여기에 리듀서 추가
  userReducer,
  signUpReducer,
  studyReducer,
});

const persistConfig = {
  key: 'root',
  storage,
  // 여기에 저장하고 싶은 리듀서 이름 추가
  whitelist: ['userReducer', 'signUpReducer', 'studyReducer'],
};

const persistedReducer = persistReducer(persistConfig, reducers);

export default configureStore({
  reducer: persistedReducer
});