// Firebase Firestore 데이터 서비스
import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  setDoc,
  orderBy, 
  query, 
  where,
  limit,
  serverTimestamp 
} from '@firebase/firestore';
import { db } from '../lib/firebase';

// 메뉴 관리
export const menuService = {
  // 모든 메뉴 가져오기
  async getMenus() {
    const q = query(collection(db, 'menus'), orderBy('order', 'asc'));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  },

  // 메뉴 추가
  async addMenu(menuData) {
    const docRef = await addDoc(collection(db, 'menus'), {
      ...menuData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    return docRef.id;
  },

  // 메뉴 수정
  async updateMenu(id, menuData) {
    const menuRef = doc(db, 'menus', id);
    await updateDoc(menuRef, {
      ...menuData,
      updatedAt: serverTimestamp()
    });
  },

  // 메뉴 삭제
  async deleteMenu(id) {
    await deleteDoc(doc(db, 'menus', id));
  }
};

// 콘텐츠 관리
export const contentService = {
  // 모든 콘텐츠 가져오기
  async getContents(category = null) {
    let q;
    
    if (category && category !== 'all') {
      q = query(collection(db, 'contents'), 
        where('category', '==', category)
      );
    } else {
      q = query(collection(db, 'contents'));
    }
    
    const querySnapshot = await getDocs(q);
    const contents = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    // 클라이언트에서 정렬: order 필드가 있으면 order로, 없으면 createdAt으로
    return contents.sort((a, b) => {
      if (a.order !== undefined && b.order !== undefined) {
        return a.order - b.order;
      }
      if (a.order !== undefined) return -1;
      if (b.order !== undefined) return 1;
      return new Date(b.createdAt?.toDate()) - new Date(a.createdAt?.toDate());
    });
  },

  // 콘텐츠 상세 가져오기
  async getContent(id) {
    const docRef = doc(db, 'contents', id);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() };
    } else {
      throw new Error('콘텐츠를 찾을 수 없습니다.');
    }
  },

  // 콘텐츠 추가
  async addContent(contentData) {
    // 해당 카테고리의 기존 프로젝트들을 가져와서 order를 +1씩 증가
    const categoryQuery = query(
      collection(db, 'contents'),
      where('category', '==', contentData.category)
    );
    
    const categorySnapshot = await getDocs(categoryQuery);
    const existingProjects = categorySnapshot.docs;
    
    // 기존 프로젝트들의 order를 +1씩 증가시키는 배치 업데이트
    const batch = [];
    existingProjects.forEach(docSnapshot => {
      const projectData = docSnapshot.data();
      const projectRef = doc(db, 'contents', docSnapshot.id);
      batch.push(updateDoc(projectRef, {
        order: (projectData.order || 0) + 1,
        updatedAt: serverTimestamp()
      }));
    });

    // 새 프로젝트는 order 0으로 추가 (맨 위에 위치)
    const docRef = await addDoc(collection(db, 'contents'), {
      ...contentData,
      // 이미지 URL 필드들 추가
      mainImage: contentData.mainImage || '',
      thumbnailImage: contentData.thumbnailImage || '',
      galleryImages: contentData.galleryImages || [],
      order: 0, // 새 프로젝트는 맨 위에 추가
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    // 기존 프로젝트들의 order 업데이트 실행
    if (batch.length > 0) {
      await Promise.all(batch);
    }

    return docRef.id;
  },

  // 콘텐츠 수정
  async updateContent(id, contentData) {
    const contentRef = doc(db, 'contents', id);
    await updateDoc(contentRef, {
      ...contentData,
      // 이미지 URL 필드들 업데이트
      mainImage: contentData.mainImage || '',
      thumbnailImage: contentData.thumbnailImage || '',
      galleryImages: contentData.galleryImages || [],
      updatedAt: serverTimestamp()
    });
  },

  // 콘텐츠 삭제
  async deleteContent(id) {
    await deleteDoc(doc(db, 'contents', id));
  },

  // 프로젝트 순서 업데이트
  async updateProjectOrder(projectIds) {
    const batch = [];
    
    for (let i = 0; i < projectIds.length; i++) {
      const contentRef = doc(db, 'contents', projectIds[i]);
      batch.push(updateDoc(contentRef, {
        order: i,
        updatedAt: serverTimestamp()
      }));
    }
    
    // 모든 업데이트를 병렬로 실행
    await Promise.all(batch);
  }
};

// 프로젝트 타입 관리
export const projectTypeService = {
  // 프로젝트 타입 옵션 가져오기
  async getProjectTypes() {
    try {
      const docRef = doc(db, 'projectTypes', 'config');
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return docSnap.data();
      } else {
        // 기본 타입 설정
        const defaultTypes = {
          Architecture: ['HOUSE', 'Commercial', 'Residential', 'Cultural', 'Office', 'Hotel', 'Restaurant'],
          Art: ['Exhibition', 'Artwork', 'Installation', 'Sculpture', 'Painting', 'Performance'],
          Design: ['Interior', 'Furniture', 'Product', 'Branding', 'Graphic', 'Web']
        };
        
        // 기본 타입을 Firebase에 저장
        await setDoc(docRef, defaultTypes);
        return defaultTypes;
      }
    } catch (error) {
      console.error('프로젝트 타입 가져오기 실패:', error);
      // 에러 시 기본값 반환
      return {
        Architecture: ['HOUSE', 'Commercial', 'Residential', 'Cultural', 'Office', 'Hotel', 'Restaurant'],
        Art: ['Exhibition', 'Artwork', 'Installation', 'Sculpture', 'Painting', 'Performance'],
        Design: ['Interior', 'Furniture', 'Product', 'Branding', 'Graphic', 'Web']
      };
    }
  },

  // 특정 카테고리에 새 타입 추가
  async addProjectType(category, newType) {
    try {
      const docRef = doc(db, 'projectTypes', 'config');
      const docSnap = await getDoc(docRef);
      
      let currentTypes = {};
      if (docSnap.exists()) {
        currentTypes = docSnap.data();
      }
      
      // 해당 카테고리에 새 타입 추가 (중복 확인)
      if (!currentTypes[category]) {
        currentTypes[category] = [];
      }
      
      if (!currentTypes[category].includes(newType)) {
        currentTypes[category] = [newType, ...currentTypes[category]];
        
        await setDoc(docRef, currentTypes);
        return true;
      }
      
      return false; // 중복
    } catch (error) {
      console.error('프로젝트 타입 추가 실패:', error);
      throw error;
    }
  },

  // 특정 카테고리의 타입 삭제
  async removeProjectType(category, typeToRemove) {
    try {
      const docRef = doc(db, 'projectTypes', 'config');
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const currentTypes = docSnap.data();
        
        if (currentTypes[category]) {
          currentTypes[category] = currentTypes[category].filter(type => type !== typeToRemove);
          await setDoc(docRef, currentTypes);
          return true;
        }
      }
      
      return false;
    } catch (error) {
      console.error('프로젝트 타입 삭제 실패:', error);
      throw error;
    }
  },

  // 특정 카테고리의 타입 수정
  async updateProjectType(category, oldType, newType) {
    try {
      const docRef = doc(db, 'projectTypes', 'config');
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const currentTypes = docSnap.data();
        
        if (currentTypes[category]) {
          const typeIndex = currentTypes[category].indexOf(oldType);
          if (typeIndex !== -1) {
            currentTypes[category][typeIndex] = newType;
            await setDoc(docRef, currentTypes);
            return true;
          }
        }
      }
      
      return false;
    } catch (error) {
      console.error('프로젝트 타입 수정 실패:', error);
      throw error;
    }
  },

  // 전체 프로젝트 타입 업데이트
  async updateProjectTypes(newTypes) {
    try {
      const docRef = doc(db, 'projectTypes', 'config');
      await setDoc(docRef, newTypes);
    } catch (error) {
      console.error('프로젝트 타입 업데이트 실패:', error);
      throw error;
    }
  },

  // 특정 타입이 사용되고 있는지 확인
  async isTypeInUse(category, typeToCheck) {
    try {
      const q = query(
        collection(db, 'contents'),
        where('category', '==', category),
        where('type', '==', typeToCheck)
      );
      
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.length > 0;
    } catch (error) {
      console.error('타입 사용 여부 확인 실패:', error);
      return false;
    }
  },

  // 카테고리별 사용 중인 연도 목록 가져오기
  async getYearsByCategory(category) {
    try {
      const q = query(
        collection(db, 'contents'),
        where('category', '==', category)
      );
      
      const querySnapshot = await getDocs(q);
      const years = new Set();
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.year && data.year.toString().trim() !== '') {
          years.add(data.year.toString());
        }
      });
      
      // 연도를 내림차순으로 정렬하여 반환
      return Array.from(years).sort((a, b) => b - a);
    } catch (error) {
      console.error('카테고리별 연도 가져오기 실패:', error);
      return [];
    }
  }
};

// 공지사항 관리
export const noticeService = {
  // 모든 공지사항 가져오기
  async getNotices() {
    const q = query(collection(db, 'notices'), orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  },

  // 최근 공지사항 가져오기
  async getRecentNotices(limitCount = 5) {
    const q = query(
      collection(db, 'notices'), 
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  },

  // 공지사항 추가
  async addNotice(noticeData) {
    const docRef = await addDoc(collection(db, 'notices'), {
      ...noticeData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    return docRef.id;
  },

  // 공지사항 수정
  async updateNotice(id, noticeData) {
    const noticeRef = doc(db, 'notices', id);
    await updateDoc(noticeRef, {
      ...noticeData,
      updatedAt: serverTimestamp()
    });
  },

  // 공지사항 삭제
  async deleteNotice(id) {
    await deleteDoc(doc(db, 'notices', id));
  }
};

// 뉴스 관리
export const newsService = {
  // 모든 뉴스 가져오기 (페이지네이션 지원)
  async getNews(options = {}) {
    const { page = 1, limit = 10 } = options;
    
    const q = query(collection(db, 'news'), orderBy('createdAt', 'desc'));
    
    const querySnapshot = await getDocs(q);
    const allNews = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    // 클라이언트 측 페이지네이션
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedNews = allNews.slice(startIndex, endIndex);
    
    return {
      news: paginatedNews,
      totalCount: allNews.length,
      totalPages: Math.ceil(allNews.length / limit),
      currentPage: page
    };
  },

  // 뉴스 상세 가져오기
  async getNewsById(id) {
    const docRef = doc(db, 'news', id);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() };
    } else {
      throw new Error('뉴스를 찾을 수 없습니다.');
    }
  },

  // 최근 뉴스 가져오기
  async getRecentNews(limitCount = 5) {
    const q = query(
      collection(db, 'news'), 
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  },

  // 뉴스 추가
  async addNews(newsData) {
    const docRef = await addDoc(collection(db, 'news'), {
      title: newsData.title,
      content: newsData.content,
      images: newsData.images || [],
      files: newsData.files || [],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    return docRef.id;
  },

  // 뉴스 수정
  async updateNews(id, newsData) {
    const newsRef = doc(db, 'news', id);
    await updateDoc(newsRef, {
      ...newsData,
      updatedAt: serverTimestamp()
    });
  },

  // 뉴스 삭제
  async deleteNews(id) {
    await deleteDoc(doc(db, 'news', id));
  }
};

// 메인 이미지 관리 서비스
export const mainImageService = {
  // 메인 이미지 컬렉션 가져오기
  async getMainImages() {
    const q = query(collection(db, 'mainImages'), orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  },

  // 타입별 메인 이미지 가져오기 (horizontal 또는 vertical)
  async getMainImagesByType(type) {
    const q = query(
      collection(db, 'mainImages'),
      where('type', '==', type),
      orderBy('createdAt', 'desc')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  },

  // 메인 이미지 추가
  async addMainImage(imageData) {
    const docRef = await addDoc(collection(db, 'mainImages'), {
      ...imageData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    return docRef.id;
  },

  // 메인 이미지 삭제
  async deleteMainImage(id) {
    await deleteDoc(doc(db, 'mainImages', id));
  },

  // 메인 이미지 업데이트
  async updateMainImage(id, imageData) {
    const imageRef = doc(db, 'mainImages', id);
    await updateDoc(imageRef, {
      ...imageData,
      updatedAt: serverTimestamp()
    });
  }
};

// About 페이지 관리 서비스
export const aboutService = {
  // About 데이터 가져오기
  async getAboutData() {
    try {
      const docRef = doc(db, 'about', 'default');
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return docSnap.data();
      } else {
        // 기본 데이터 반환
        return this.getDefaultAboutData();
      }
    } catch (error) {
      console.error('About 데이터 로딩 실패:', error);
      return this.getDefaultAboutData();
    }
  },

  // About 데이터 저장/업데이트
  async saveAboutData(aboutData) {
    const docRef = doc(db, 'about', 'default');
    await updateDoc(docRef, {
      ...aboutData,
      updatedAt: serverTimestamp()
    }).catch(async () => {
      // 문서가 존재하지 않으면 새로 생성 (setDoc 사용)
      await setDoc(docRef, {
        ...aboutData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    });
  },

  // 회사 정보만 업데이트
  async updateCompanyInfo(companyInfo) {
    const docRef = doc(db, 'about', 'default');
    await updateDoc(docRef, {
      companyInfo: companyInfo,
      updatedAt: serverTimestamp()
    }).catch(async () => {
      // 문서가 존재하지 않으면 새로 생성 (setDoc 사용)
      const defaultData = this.getDefaultAboutData();
      await setDoc(docRef, {
        ...defaultData,
        companyInfo: companyInfo,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    });
  },

  // CEO 정보만 업데이트
  async updateCeoData(ceoData) {
    const docRef = doc(db, 'about', 'default');
    await updateDoc(docRef, {
      ceoData: ceoData,
      updatedAt: serverTimestamp()
    }).catch(async () => {
      // 문서가 존재하지 않으면 새로 생성 (setDoc 사용)
      const defaultData = this.getDefaultAboutData();
      await setDoc(docRef, {
        ...defaultData,
        ceoData: ceoData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    });
  },

  // 기본 About 데이터
  getDefaultAboutData() {
    return {
      companyInfo: {
        mainImage: 'https://pub-1331f8c46b8d4b71aa752849b530c45e.r2.dev/about.jpg',
        descriptionKo: `건축가그룹 운생동은 개념적 건축에 뿌리를 두고, 건축의 가능성을 다각적으로 발현해 내는 건축가들의 '협력집단체'다. 진보적 건축 유형의 개발, 건축과 예술의 통합, 브랜드 가치를 만들어내는 디자인, 공공 건축을 통한 사회적 기여를 목표로 50인의 전문가가 소속되어 건축설계, 건축기획, 프로그래밍, 도시설계, 단지계획 등의 분야를 주력으로 수행한다.

지난 24년간 공공과 사회에 대한 깊은 책임감을 지니고 한국 건축을 이끌어 나간다는 선구자적 사명감으로 새로운 시도와 실험을 멈추지 않았다. 완전하게 결합되어 종속되거나 섞이는 것이 아니라 각 요소 본연의 성질을 가진 채 병치되고 공존하는 '복합체'의 건축론을 토대로 '신화적 상상력'을 건축과 도시의 디자인으로 풀어내기 위해 부단히 노력해왔다.

갤러리정미소와 건축문화 온라인 플랫폼 스페이스 코디네이터를 통해 젊은 건축가 및 예술인들의 작업을 소개하고, 교류와 협업을 도우며, 도시 및 지역사회의 문제 해결을 위한 사회문화적 활동을 하고 있다. 시대의 이슈를 담은 전시와 공모전, 강연, 답사 및 포럼 등을 통해 접점을 넓히고 한국 건축문화 발전에 기여해왔다.`,
        descriptionEn: `Unsangdong, an architect group, is a "cooperative group" rooted in conceptual architecture. It explores the possibilities of architecture in multifaceted ways, integrating art and design, and generating cultural and public value. The group, composed of 50 experts, works across architectural design, urban planning, public projects, and more, engaging in both practical and experimental efforts.

For over 23 years, Unsangdong has led innovative architectural practices with a deep commitment to the public and social good. Their work is grounded in the theory of the "compound body," where each element coexists without losing its essence—rather than being mixed or subordinated, they maintain their nature and form new relationships. This concept is expressed through "mythical imagination," a tool for envisioning new urban and architectural possibilities.

Through Gallery Jungmiso and the online platform Space Coordinator, the group introduces the work of young architects and artists, encouraging collaboration and exchange. They actively participate in exhibitions, competitions, lectures, and forums that address current urban and cultural issues, contributing to the ongoing evolution of Korean architectural culture.`,
        organizationImage: 'https://pub-1331f8c46b8d4b71aa752849b530c45e.r2.dev/organization.png',
        organizationImageMo: 'https://pub-1331f8c46b8d4b71aa752849b530c45e.r2.dev/organization-mo.png'
      },
      ceoData: {
        jang: {
          nameEn: 'Yoongyoo Jang',
          nameKo: '장윤규',
          title: '건축가그룹 운생동 대표, 국민대 건축대학 교수, 갤러리 정미소 대표',
          titleEn: 'Principal of Unsangdong Architects Cooperation, Professor of Kookmin University, Representative of Gallery Jungmiso, Seoul, Korea',
          description: `장윤규는 건축과 관련된 현상들을 탐구하고 건축의 개념에서 건축의 물리적 실체가 비롯된다고 생각하는 진보적 건축가다. 서울대학교 건축학과와 동 대학원을 졸업하고 장윤규건축실험아뜰리에를 세웠다. 건축사사무소 아르텍, 희림종합건축사사무소 등에서 소장과 이사를 역임하며 현상설계를 통해 특출한 성과를 냈다. 이후 실험적 건축가집단을 주창하는 운생동건축사사무소를 설립해 '플로팅(floating)', '스킨스케이프(skinscape)', '트랜스프로그래밍(trans-programming)', '인간이 동물 되기(becoming an animal)' 등의 주제로 변화하고 움직이는, 새로운 시대의 건축에 주력했다.

초창기작 예화랑, 크링 등으로 해외 유수 건축매체와 어워드에 이름을 올리는 등 국제적 명성을 얻고 서울대학교 건축대학, 홍익대학교 대학로캠퍼스, 청심 물문화관, 광주 디자인센터 등 교육문화시설과 도화서길, 생능출판사 사옥, 미동전자 사옥, 오토웨이타워, 몽유도원도 이상봉타워 등 도심의 오피스 빌딩으로 많이 알려져 있으나 주거와 중소규모 공공건축 작업도 꾸준히 지속하고 있다. AR 이머징 어워드, 한국건축문화대상, 서울시건축상, 한국건축가협회상 등을 다수 수상했고 인천 검단 박물관·도서관 복합문화시설, 국립디자인박물관, 잠실종합운동장 주경기장, 신내 컴팩트시티, 대구 중구 공공도서관, 광주비엔날레전시관 등 국제 현상설계공모에서 당선했다. 국민대학교 건축대학 교수로 재직하고 있다.`,
          descriptionEn: `Jang Yoon Gyoo is a progressive architect who believes that architecture's physical form arises from its conceptual foundations. He studied architecture at Seoul National University and later founded the Jang Yoon-Gyoo Architecture Experiment Atelier. After serving as director at Artech Architects and Heerim Architects & Planners, he co-founded Unsangdong Architects, an experimental collective known for themes like "floating," "skinscape," and "becoming an animal," exploring architecture as a dynamic, evolving entity.

His early projects, such as Gallery Yeh and Kring, gained international recognition, and he has designed various cultural, educational, residential, and office buildings including the Seoul National University Architecture College, Gwangju Design Center, and Autoway Tower. He has won multiple awards, including the AR Emerging Architecture Award and the Korean Architecture Award, and secured victories in international competitions for projects like the National Design Museum and the Jamsil Main Stadium. He is currently a professor at Kookmin University's School of Architecture.`
        },
        shin: {
          nameEn: 'Changhoon Shin',
          nameKo: '신창훈',
          title: '건축가그룹 운생동 공동대표',
          titleEn: 'Principal of Unsangdong Architects Cooperation',
          description: `운생동의 공동대표 신창훈은 1970년생으로 영남대학교 건축공학과와 서울시립대학교 건축대학원을 졸업했다. 아르텍건축, 범건축, 힘마건축에서 실무 경험을 쌓고 장윤규와 함께 실험건축, 개념적 건축을 실현하기 위해서 건축가그룹 운생동을 결성했다.

현 시대의 주요 관심사들을 놓치지 않고 연구하면서 '실험'과 '아이디어'를 뛰어 넘어 건축적 구축을 실현하기 위한 작업을 진행한다. '스페이스 코디네이터'와 '건축공감'을 기획, 운영하며 한국 건축의 아카이브와 소개에 힘쓰고 있다. 한국건축가협회 젊은 건축가위원회 위원장, 문화체육관광부 한국문화예술 위원회 및 국제건축문화교류 프로그램 총괄큐레이터, 대한민국 건축문화제 위원장 등으로 활동하며 젊은 건축가 저변 확대와 건축계 교류, 전시기획과 출간 등을 통한 대중 건축문화 발전을 위해 노력했다. 서울시 공공건축가를 역임했고 대구 지역 최초 총괄건축가로서 수성국제비엔날레 부위원장을 맡고 있다.`,
          descriptionEn: `Shin Chang Hoon, co-principal of Unsangdong Architects, was born in 1970 and studied architectural engineering at Yeungnam University and architecture at the University of Seoul. After working at Artech Architects, BAUM Architects, and HIMMA Architects, he co-founded Unsangdong with Jang Yoongyoo to pursue experimental and conceptual architecture.

Shin focuses on turning contemporary issues into built form, going beyond ideas to architectural realization. He also promotes Korean architecture through projects like 'Space Coordinator' and 'Architectural Empathy'. He has held key roles in architectural organizations, including the Korean Institute of Architects and the Korea Arts Council, and served as Vice Chair of the Suseong International Biennale as Daegu's first Chief Architect.`
        }
      }
    };
  }
};

// Awards 페이지 관리 서비스
export const awardsService = {
  // Awards 데이터 가져오기
  async getAwardsData() {
    try {
      const docRef = doc(db, 'awards', 'default');
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return docSnap.data();
      } else {
        // 기본 데이터 반환
        return this.getDefaultAwardsData();
      }
    } catch (error) {
      console.error('Awards 데이터 로딩 실패:', error);
      return this.getDefaultAwardsData();
    }
  },

  // Awards 데이터 저장/업데이트
  async saveAwardsData(awardsData) {
    const docRef = doc(db, 'awards', 'default');
    await updateDoc(docRef, {
      awardsData: awardsData,
      updatedAt: serverTimestamp()
    }).catch(async () => {
      // 문서가 존재하지 않으면 새로 생성
      await setDoc(docRef, {
        awardsData: awardsData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    });
  },

  // 기본 Awards 데이터
  getDefaultAwardsData() {
    return [
      {
        year: "2024",
        awards: [
          {
            title: {
              EN: "Grand Prize and Citizens' Choice Special Award from the 42nd Seoul Architecture Awards – 'Odong Public Library'",
              KO: "제42회 서울시 건축상 대상 및 시민선택특별상 – '오동도서관'"
            }
          }
        ]
      },
      {
        year: "2023",
        awards: [
          {
            title: {
              EN: "Special Award from Korea Wood Architecture Awards – 'Odong Public Library'",
              KO: "한국목조건축대상 특별상 – '오동도서관'"
            }
          },
          {
            title: {
              EN: "Award from the Korean Institute of Architects (KIA) – 'Odong Public Library'",
              KO: "대한건축학회상 – '오동도서관'"
            }
          }
        ]
      },
      {
        year: "2022",
        awards: [
          {
            title: {
              EN: "Excellence Award in Social & Public part from Korea Architecture Culture Awards – 'Change Up Ground Pohang'",
              KO: "한국건축문화대상 사회공공부문 우수상 – '체인지업그라운드 포항'"
            }
          },
          {
            title: {
              EN: "Architecture Award from the Korean Institute of Architects (KIA) – 'Change Up Ground Pohang'",
              KO: "대한건축학회상 – '체인지업그라운드 포항'"
            }
          }
        ]
      },
      {
        year: "2020",
        awards: [
          {
            title: {
              EN: "1st prize, Seoul Compact City International Design Competition – Designing Multi-Level Complex on the Bukbu Expressway",
              KO: "서울시 컴팩트시티 국제설계공모 최우수상 – 북부간선도로 상부 다층복합단지 설계"
            }
          }
        ]
      },
      {
        year: "2019",
        awards: [
          {
            title: {
              EN: "2nd prize, Design Competition for Ecological and Leisure-cultural Waterfront Space in Seoul International District",
              KO: "서울 국제금융지구 생태여가문화 수변공간 설계공모 우수상"
            }
          },
          {
            title: {
              EN: "Design Competition for '1BL Public Housing in the Goduk-Gangil District'",
              KO: "고덕강일 1BL 공공임대주택 설계공모 당선"
            }
          },
          {
            title: {
              EN: "3rd prize, Urban Farming Platform Design Proposal Competition",
              KO: "도시농업플랫폼 설계공모 장려상"
            }
          }
        ]
      },
      {
        year: "2018",
        awards: [
          {
            title: {
              EN: "2nd prize, Architecture Award from Seoul Metropolitan City – 'Sopoong-gil Community'",
              KO: "서울특별시 건축상 우수상 – '소풍길 공동체'"
            }
          },
          {
            title: {
              EN: "The Plan Awards Public space, Italy – 'Hannae Forest of wisdom'",
              KO: "The Plan Awards 공공공간 부문 (이탈리아) – '한내지혜의숲'"
            }
          },
          {
            title: {
              EN: "K-Design Award Gold Winner of Complex Library",
              KO: "K-Design Award 복합도서관 부문 골드 수상"
            }
          }
        ]
      },
      {
        year: "2017",
        awards: [
          {
            title: {
              EN: "1st prize, Architecture Award from Seoul Metropolitan City – 'Hannae Forest of wisdom'",
              KO: "서울특별시 건축상 대상 – '한내지혜의숲'"
            }
          },
          {
            title: {
              EN: "Award from Korean Architecture & Culture – 'Hannae Forest of wisdom'",
              KO: "한국건축문화대상 – '한내지혜의숲'"
            }
          },
          {
            title: {
              EN: "Year's Architecture best 7 – 'Hannae Forest of wisdom'",
              KO: "올해의 건축 베스트 7 – '한내지혜의숲'"
            }
          },
          {
            title: {
              EN: "1st prize, The generation-Convergence Start-Up Center and 50 Plus Campus",
              KO: "세대융합형 창업지원센터 및 50플러스캠퍼스 설계공모 최우수상"
            }
          }
        ]
      },
      {
        year: "2016",
        awards: [
          {
            title: {
              EN: "1st prize, Dasan-Dong Fortress Wall of Seoul Parking and Cultural Center",
              KO: "서울성곽 다산동 주차문화센터 설계공모 최우수상"
            }
          }
        ]
      },
      {
        year: "2015",
        awards: [
          {
            title: {
              EN: "Sejong-daero Historic Culture Space Design Competition, 2nd Prize",
              KO: "세종대로 역사문화공간 설계공모 우수상"
            }
          },
          {
            title: {
              EN: "International Idea competition for Urban Regeneration of Jamsil Sports Complex",
              KO: "잠실종합운동장 일대 도시재생 국제아이디어 공모 당선"
            }
          }
        ]
      },
      {
        year: "2013",
        awards: [
          {
            title: {
              EN: "Gangnam-gu beautiful architecture – 'Bogojae'",
              KO: "강남구 아름다운 건축물 – '보고재'"
            }
          }
        ]
      },
      {
        year: "2012",
        awards: [
          {
            title: {
              EN: "Architecture Award from Seoul Metropolitan City – 'Sungdong Municipal Office Complex'",
              KO: "서울특별시 건축상 – '성동구청 복합청사'"
            }
          },
          {
            title: {
              EN: "Architecture Award of Seoul Metropolitan City – 'Seongdong Cultural & Welfare Center'",
              KO: "서울특별시 건축상 – '성동구민회관'"
            }
          }
        ]
      },
      {
        year: "2011",
        awards: [
          {
            title: {
              EN: "Korean Good Design Award – Holiday Inn GwangJu",
              KO: "굿디자인어워드 – 홀리데이인 광주"
            }
          },
          {
            title: {
              EN: "Architecture Award from Seoul Metropolitan City – 'Yellow Diamond, Culture Complex'",
              KO: "서울특별시 건축상 – '옐로우 다이아몬드, 문화복합시설'"
            }
          },
          {
            title: {
              EN: "Award from Korean Architecture & Culture – 'Yellow Diamond, Culture Complex'",
              KO: "한국건축문화대상 – '옐로우 다이아몬드, 문화복합시설'"
            }
          },
          {
            title: {
              EN: "1st prize award in green technology from Korea Institute of Ecological Architecture and Environment",
              KO: "한국생태환경건축학회 친환경기술부문 대상"
            }
          }
        ]
      },
      {
        year: "2010",
        awards: [
          {
            title: {
              EN: "Award from the Korean Institute of Architects (KIA)",
              KO: "대한건축학회상"
            }
          },
          {
            title: {
              EN: "Architecture Award from Seoul Metropolitan City",
              KO: "서울특별시 건축상"
            }
          }
        ]
      },
      {
        year: "2009",
        awards: [
          {
            title: {
              EN: "Grand prize award from Korean Space & Culture Institute",
              KO: "한국공간문화학회 대상"
            }
          },
          {
            title: {
              EN: "Good Designer prize of Korean Good Design Award",
              KO: "굿디자인어워드 굿디자이너상"
            }
          }
        ]
      },
      {
        year: "2007",
        awards: [
          {
            title: {
              EN: "Award from the Korean Institute of Architects (KIA)",
              KO: "대한건축학회상"
            }
          },
          {
            title: {
              EN: "Architecture Award of Seoul Metropolitan City",
              KO: "서울특별시 건축상"
            }
          },
          {
            title: {
              EN: "Award of Korean Architecture & Culture",
              KO: "한국건축문화대상"
            }
          },
          {
            title: {
              EN: "Architectural Review Highly Commended Award",
              KO: "Architectural Review 고도추천상"
            }
          }
        ]
      },
      {
        year: "2006",
        awards: [
          {
            title: {
              EN: "Design Vanguard Award by Architectural Record – 'Gallery Yeh'",
              KO: "Architectural Record 디자인 뱅가드 어워드 – '갤러리 예'"
            }
          }
        ]
      },
      {
        year: "2005",
        awards: [
          {
            title: {
              EN: "Award from the Korean Institute of Architects (KIA) – 'Gallery Yeh'",
              KO: "대한건축학회상 – '갤러리 예'"
            }
          }
        ]
      },
      {
        year: "1994",
        awards: [
          {
            title: {
              EN: "Honorable Mention, Shinkenchiku Takiron International Competion",
              KO: "신건축 타키론 국제공모 장려상"
            }
          }
        ]
      }
    ];
  }
};

// Contact 관리 서비스
export const contactService = {
  // Contact 정보 가져오기
  async getContactInfo() {
    try {
      const docRef = doc(db, 'contact', 'info');
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return docSnap.data();
      } else {
        // 기본 데이터 반환
        return this.getDefaultContactInfo();
      }
    } catch (error) {
      console.error('Contact 정보 로딩 실패:', error);
      return this.getDefaultContactInfo();
    }
  },

  // Contact 정보 저장/업데이트
  async saveContactInfo(contactInfo) {
    const docRef = doc(db, 'contact', 'info');
    await updateDoc(docRef, {
      ...contactInfo,
      updatedAt: serverTimestamp()
    }).catch(async () => {
      // 문서가 존재하지 않으면 새로 생성
      await setDoc(docRef, {
        ...contactInfo,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    });
  },

  // 기본 Contact 정보
  getDefaultContactInfo() {
    return {
      address: {
        ko: "서울특별시 성북구 창경궁로 43길 41",
        en: "41, Changgyeonggung-ro 43-gil, Seongbuk-gu, Seoul, South Korea"
      },
      email: "usdspace2007@naver.com",
      tel: "+82 2-764-8401",
      fax: "+82 2-764-8403",
      sns: {
        instagram: "@unsangdong",
        url: "https://www.instagram.com/unsangdong/"
      }
    };
  },

  // 문의사항 저장하기
  async saveInquiry(inquiryData) {
    try {
      const docRef = doc(collection(db, 'inquiries'));
      await setDoc(docRef, {
        ...inquiryData,
        createdAt: serverTimestamp(),
        status: 'new' // new, read, replied
      });
      return docRef.id;
    } catch (error) {
      console.error('문의사항 저장 실패:', error);
      throw error;
    }
  },

  // 문의사항 목록 가져오기
  async getInquiries() {
    try {
      const q = query(collection(db, 'inquiries'), orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      
      const inquiries = [];
      querySnapshot.forEach((doc) => {
        inquiries.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      return inquiries;
    } catch (error) {
      console.error('문의사항 목록 로딩 실패:', error);
      throw error;
    }
  },

  // 문의사항 상태 업데이트
  async updateInquiryStatus(inquiryId, status) {
    try {
      const docRef = doc(db, 'inquiries', inquiryId);
      await updateDoc(docRef, {
        status: status,
        updatedAt: serverTimestamp()
      });
      return true;
    } catch (error) {
      console.error('문의사항 상태 업데이트 실패:', error);
      throw error;
    }
  },

  // 문의사항 삭제
  async deleteInquiry(inquiryId) {
    try {
      await deleteDoc(doc(db, 'inquiries', inquiryId));
      return true;
    } catch (error) {
      console.error('문의사항 삭제 실패:', error);
      throw error;
    }
  }
};

// Book 관리 서비스
export const bookService = {
  // 모든 Book 가져오기
  async getBooks() {
    try {
      const q = query(collection(db, 'books'));
      const querySnapshot = await getDocs(q);
      const books = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // 클라이언트에서 정렬: order 필드가 있으면 order로, 없으면 createdAt으로
      return books.sort((a, b) => {
        if (a.order !== undefined && b.order !== undefined) {
          return a.order - b.order;
        }
        if (a.order !== undefined) return -1;
        if (b.order !== undefined) return 1;
        return new Date(b.createdAt?.toDate()) - new Date(a.createdAt?.toDate());
      });
    } catch (error) {
      console.error('Book 목록 조회 오류:', error);
      throw error;
    }
  },

  // Book 상세 가져오기
  async getBook(id) {
    try {
      const docRef = doc(db, 'books', id);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() };
      } else {
        throw new Error('Book을 찾을 수 없습니다.');
      }
    } catch (error) {
      console.error('Book 조회 오류:', error);
      throw error;
    }
  },

  // Book 추가
  async addBook(bookData) {
    try {
      // 기존 도서들을 가져와서 order를 +1씩 증가
      const q = query(collection(db, 'books'));
      const querySnapshot = await getDocs(q);
      const existingBooks = querySnapshot.docs;
      
      // 기존 도서들의 order를 +1씩 증가시키는 배치 업데이트
      const batch = [];
      existingBooks.forEach(docSnapshot => {
        const bookData = docSnapshot.data();
        const bookRef = doc(db, 'books', docSnapshot.id);
        batch.push(updateDoc(bookRef, {
          order: (bookData.order || 0) + 1,
          updatedAt: serverTimestamp()
        }));
      });

      // 새 도서는 order 0으로 추가 (맨 위에 위치)
      const docRef = await addDoc(collection(db, 'books'), {
        title: bookData.title,
        size: bookData.size,
        externalLink: bookData.externalLink || '',
        thumbnailImage: bookData.thumbnailImage,
        detailImages: bookData.detailImages || [],
        order: 0, // 새 도서는 맨 위에 추가
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      // 기존 도서들의 order 업데이트 실행
      if (batch.length > 0) {
        await Promise.all(batch);
      }

      return docRef.id;
    } catch (error) {
      console.error('Book 추가 오류:', error);
      throw error;
    }
  },

  // Book 수정
  async updateBook(id, bookData) {
    try {
      const bookRef = doc(db, 'books', id);
      await updateDoc(bookRef, {
        title: bookData.title,
        size: bookData.size,
        externalLink: bookData.externalLink || '',
        thumbnailImage: bookData.thumbnailImage,
        detailImages: bookData.detailImages || [],
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Book 수정 오류:', error);
      throw error;
    }
  },

  // Book 삭제
  async deleteBook(id) {
    try {
      await deleteDoc(doc(db, 'books', id));
    } catch (error) {
      console.error('Book 삭제 오류:', error);
      throw error;
    }
  },

  // Book 순서 업데이트
  async updateBookOrder(bookIds) {
    const batch = [];
    
    for (let i = 0; i < bookIds.length; i++) {
      const bookRef = doc(db, 'books', bookIds[i]);
      batch.push(updateDoc(bookRef, {
        order: i,
        updatedAt: serverTimestamp()
      }));
    }
    
    // 모든 업데이트를 병렬로 실행
    await Promise.all(batch);
  }
};

// Press 관리 서비스
export const pressService = {
  // 모든 Press 가져오기
  async getPress() {
    try {
      const q = query(collection(db, 'press'));
      const querySnapshot = await getDocs(q);
      const pressItems = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // 클라이언트에서 정렬: order 필드가 있으면 order로, 없으면 createdAt으로
      return pressItems.sort((a, b) => {
        if (a.order !== undefined && b.order !== undefined) {
          return a.order - b.order;
        }
        if (a.order !== undefined) return -1;
        if (b.order !== undefined) return 1;
        return new Date(b.createdAt?.toDate()) - new Date(a.createdAt?.toDate());
      });
    } catch (error) {
      console.error('Error fetching press:', error);
      throw error;
    }
  },

  // 특정 Press 아이템 가져오기
  async getPressItem(id) {
    try {
      const docRef = doc(db, 'press', id);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return {
          id: docSnap.id,
          ...docSnap.data()
        };
      } else {
        throw new Error('Press item not found');
      }
    } catch (error) {
      console.error('Error fetching press item:', error);
      throw error;
    }
  },

  // Press 아이템 추가
  async addPressItem(pressData) {
    try {
      // 기존 Press들을 가져와서 order를 +1씩 증가
      const q = query(collection(db, 'press'));
      const querySnapshot = await getDocs(q);
      const existingPress = querySnapshot.docs;
      
      // 기존 Press들의 order를 +1씩 증가시키는 배치 업데이트
      const batch = [];
      existingPress.forEach(docSnapshot => {
        const pressData = docSnapshot.data();
        const pressRef = doc(db, 'press', docSnapshot.id);
        batch.push(updateDoc(pressRef, {
          order: (pressData.order || 0) + 1,
          updatedAt: serverTimestamp()
        }));
      });

      // 새 Press는 order 0으로 추가 (맨 위에 위치)
      const data = {
        ...pressData,
        order: 0, // 새 Press는 맨 위에 추가
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      const docRef = await addDoc(collection(db, 'press'), data);

      // 기존 Press들의 order 업데이트 실행
      if (batch.length > 0) {
        await Promise.all(batch);
      }

      return docRef.id;
    } catch (error) {
      console.error('Error adding press item:', error);
      throw error;
    }
  },

  // Press 아이템 수정
  async updatePressItem(id, pressData) {
    try {
      const docRef = doc(db, 'press', id);
      const updateData = {
        ...pressData,
        order: pressData.order || 0, // order 필드가 없으면 0으로 설정
        updatedAt: serverTimestamp()
      };
      
      await updateDoc(docRef, updateData);
    } catch (error) {
      console.error('Error updating press item:', error);
      throw error;
    }
  },

  // Press 아이템 삭제
  async deletePressItem(id) {
    try {
      await deleteDoc(doc(db, 'press', id));
    } catch (error) {
      console.error('Error deleting press item:', error);
      throw error;
    }
  },

  // Press 순서 업데이트
  async updatePressOrder(pressIds) {
    const batch = [];
    
    for (let i = 0; i < pressIds.length; i++) {
      const pressRef = doc(db, 'press', pressIds[i]);
      batch.push(updateDoc(pressRef, {
        order: i,
        updatedAt: serverTimestamp()
      }));
    }
    
    // 모든 업데이트를 병렬로 실행
    await Promise.all(batch);
  }
};

// 통계 서비스
export const statsService = {
  // 전체 통계 가져오기
  async getStats() {
    const [menus, contents, notices, mainImages, books, press] = await Promise.all([
      getDocs(collection(db, 'menus')),
      getDocs(collection(db, 'contents')),
      getDocs(collection(db, 'notices')),
      getDocs(collection(db, 'mainImages')),
      getDocs(collection(db, 'books')),
      getDocs(collection(db, 'press'))
    ]);

    return {
      menuCount: menus.size,
      contentCount: contents.size,
      noticeCount: notices.size,
      mainImagesCount: mainImages.size,
      bookCount: books.size,
      pressCount: press.size,
      todayVisits: 0, // 방문자 추적 기능 구현 시 업데이트
      monthlyVisits: 0
    };
  }
}; 