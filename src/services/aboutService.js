import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';

const ABOUT_DOC_ID = 'about-info';

// About 정보 가져오기
export const getAboutInfo = async () => {
  try {
    const docRef = doc(db, 'about', ABOUT_DOC_ID);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return docSnap.data();
    } else {
      // 기본값 반환
      return {
        storyText: `서울에서 만들어진 그래픽 디자인 스튜디오 어랏은, 의뢰 프로젝트에 대한 깊은 이해를 바탕으로
웹사이트, 그래픽, 모션, 에디토리얼 등 다양한 시각적 결과물을 고민하고 제안합니다.
시선을 끄는 글, 흥미로운 코드, 기분좋은 그래픽을 신조로, 생각에서 출발한 디자인이
소비자에게 도착하기까지의 모든 과정을 연구합니다.`,
        email: 'contact@alolot.kr',
        instagram: 'https://www.instagram.com/alolot.kr/',
        anotherProjects: [
          '2025, Child Knee Kick 참여',
          '2025, Things After... 참여',
          '2025, ISSUEGRAPHY 참여',
          '2024, 〈냠냠쩝쩝 레터링〉 워크숍 진행',
          '2024, 〈2024 서울시립대학교 시각디자인전공 졸업전시회〉 기획, 참여',
          '2024, 〈모두의 국악상점〉 전시 참여',
          '2024, 〈북 바인딩〉 워크숍 기획, 진행',
          '2024, 〈빌딩 프린트룸〉 워크숍 기획, 진행',
          '2023, 〈가까이 더 가까이: 몸, 공간, 활자〉 워크숍 도움',
          '2022, 〈세상 모두가 부리부리몬〉 전시 기획, 참여',
          '2022, WHOOPPY! 운영',
          '2021, 〈편견의말들〉 전시 참여',
          '2019, 〈ON THE SHELF〉 전시 참여'
        ],
        partners: `안전가옥, 하자센터, 이응셋, 플레디스 엔터테인먼트, 비투비컴퍼니, KIOT, 보더라인벤처스,
서울시립대학교, 서울휴먼라이브러리, apM, 윤보인, 비러프, TT서울, 국립국악원,
First Things First, Things After..., 에이투지 엔터테인먼트, 파도스터프, 텔로, 모닝아트,
온키, 스튜디오 노마드, 데스커, 크리에이팁, 식스샵, 운생동 건축사사무소, 셋더스테이지,
비팩토리, Eider, ISSUEGRAPHY, Child Knee Kick`
      };
    }
  } catch (error) {
    console.error('About 정보 가져오기 실패:', error);
    throw error;
  }
};

// About 정보 저장하기
export const saveAboutInfo = async (aboutData) => {
  try {
    const docRef = doc(db, 'about', ABOUT_DOC_ID);
    await setDoc(docRef, {
      ...aboutData,
      updatedAt: new Date()
    });
  } catch (error) {
    console.error('About 정보 저장 실패:', error);
    throw error;
  }
}; 