import { useState, useEffect, useRef } from "react";
import AdminLayout from "../components/AdminLayout";
import { imageService } from "../services/imageService";
import { aboutService } from "../services/dataService";

export default function AboutManager() {
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [activeTab, setActiveTab] = useState("company");
  const [companyInfo, setCompanyInfo] = useState({
    mainImage: "https://pub-1331f8c46b8d4b71aa752849b530c45e.r2.dev/about.jpg",
    descriptionKo: "",
    descriptionEn: "",
    organizationImage:
      "https://pub-1331f8c46b8d4b71aa752849b530c45e.r2.dev/organization.png",
    organizationImageMo:
      "https://pub-1331f8c46b8d4b71aa752849b530c45e.r2.dev/organization-mo.png",
  });
  const [ceoData, setCeoData] = useState({
    jang: {
      nameEn: "Yoongyoo Jang",
      nameKo: "장윤규",
      title: "건축가그룹 운생동 대표, 국민대 건축대학 교수, 갤러리 정미소 대표",
      titleEn:
        "Principal of Unsangdong Architects Cooperation, Professor of Kookmin University, Representative of Gallery Jungmiso, Seoul, Korea",
      description: "",
      descriptionEn: "",
    },
    shin: {
      nameEn: "Changhoon Shin",
      nameKo: "신창훈",
      title: "건축가그룹 운생동 공동대표",
      titleEn: "Principal of Unsangdong Architects Cooperation",
      description: "",
      descriptionEn: "",
    },
  });

  // 파일 선택을 위한 refs
  const mainImageInputRef = useRef(null);
  const orgImageInputRef = useRef(null);
  const orgImageMoInputRef = useRef(null);

  useEffect(() => {
    loadAboutData();
  }, []);

  async function loadAboutData() {
    try {
      setLoading(true);

      // Firebase에서 About 데이터 로드
      const aboutData = await aboutService.getAboutData();

      if (aboutData.companyInfo) {
        setCompanyInfo(aboutData.companyInfo);
      }

      if (aboutData.ceoData) {
        setCeoData(aboutData.ceoData);
      }
    } catch (error) {
      console.error("About 데이터 로딩 실패:", error);
      alert("데이터 로딩에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  }

    async function handleSaveCompanyInfo() {
    try {
      // Firebase에 회사 정보 저장
      await aboutService.updateCompanyInfo(companyInfo);
      alert("회사 소개가 성공적으로 저장되었습니다.");
    } catch (error) {
      alert("회사 소개 저장에 실패했습니다: " + error.message);
    }
  }

  async function handleSaveCeoData() {
    try {
      // Firebase에 CEO 정보 저장
      await aboutService.updateCeoData(ceoData);
      alert("대표 소개가 성공적으로 저장되었습니다.");
    } catch (error) {
      alert("대표 소개 저장에 실패했습니다: " + error.message);
    }
  }

  function updateCompanyInfo(field, value) {
    setCompanyInfo((prev) => ({ ...prev, [field]: value }));
  }

  function updateCeoData(person, field, value) {
    setCeoData((prev) => ({
      ...prev,
      [person]: {
        ...prev[person],
        [field]: value,
      },
    }));
  }

  // 이미지 업로드 처리 함수
  async function handleImageUpload(field, file) {
    if (!file) return;

    try {
      setUploading(true);

      // imageService를 사용하여 이미지 업로드
      const uploadResult = await imageService.uploadImage(file, {
        source: "about-page",
        type: field,
      });

      // 업로드 성공 시 URL 업데이트
      updateCompanyInfo(field, uploadResult.imageUrl);
      alert("이미지가 성공적으로 변경되었습니다.");
    } catch (error) {
      console.error("이미지 업로드 실패:", error);
      alert(`이미지 업로드에 실패했습니다: ${error.message}`);
    } finally {
      setUploading(false);
    }
  }

  // 파일 선택 트리거 함수들
  const triggerMainImageSelect = () => mainImageInputRef.current?.click();
  const triggerOrgImageSelect = () => orgImageInputRef.current?.click();
  const triggerOrgImageMoSelect = () => orgImageMoInputRef.current?.click();

  return (
    <AdminLayout>
      <div className="admin-content">
              <h2 className="admin-page-title">ABOUT 관리</h2>
                          {/* 탭 네비게이션 */}
            <div className="admin-tabs">
              <button
                className={`admin-tab ${
                  activeTab === "company" ? "active" : ""
                }`}
                onClick={() => setActiveTab("company")}
              >
                회사 소개
              </button>
              <button
                className={`admin-tab ${activeTab === "ceo" ? "active" : ""}`}
                onClick={() => setActiveTab("ceo")}
              >
                대표 소개
              </button>
            </div>

        <div className="admin-content-layout">
          <div className="admin-content-main">

            {loading ? (
              <p>로딩 중...</p>
            ) : (
              <>
                {/* 회사 정보 탭 */}
                {activeTab === "company" && (
                  <div className="admin-content-section" style={{paddingBottom: "0px"}}>
                    <div className="admin-content-header">
                      <h3 className="admin-content-title">회사 소개 관리</h3>
                      <button
                        className="admin-button admin-button-primary"
                        onClick={handleSaveCompanyInfo}
                      >
                        저장
                      </button>
                    </div>

                      <div className="admin-about-container">
                    {/* 메인 이미지 */}
                    <div className="admin-form-section">
                      <div className="admin-form-wrap">
                        <h4>대표 이미지</h4>
                        <button
                          onClick={triggerMainImageSelect}
                          disabled={uploading}
                          className="admin-button admin-button-secondary"
                        >
                          {uploading ? "업로드 중..." : "이미지 변경"}
                        </button>
                      </div>
                      <div className="admin-image-preview">
                        <img
                          src={companyInfo.mainImage}
                          alt="메인 이미지"
                          style={{ maxWidth: "80%", height: "auto" }}
                        />
                      </div>
                      <div className="admin-image-controls">
                        <input
                          ref={mainImageInputRef}
                          type="file"
                          accept="image/*"
                          onChange={(e) =>
                            handleImageUpload("mainImage", e.target.files[0])
                          }
                          style={{ display: "none" }}
                        />
                      </div>
                    </div>

                    <div className="admin-about-wrap">
                      <h3>회사 소개</h3>
                      {/* 회사 소개 (한국어) */}
                      <div className="admin-form-section">
                        <h4>국문</h4>
                        <textarea
                          value={companyInfo.descriptionKo}
                          onChange={(e) =>
                            updateCompanyInfo("descriptionKo", e.target.value)
                          }
                          className="admin-textarea"
                          rows="10"
                          placeholder="국문 회사 소개를 입력하세요"
                        />
                      </div>

                      {/* 회사 소개 (영어) */}
                      <div className="admin-form-section">
                        <h4>영문</h4>
                        <textarea
                          value={companyInfo.descriptionEn}
                          onChange={(e) =>
                            updateCompanyInfo("descriptionEn", e.target.value)
                          }
                          className="admin-textarea"
                          rows="10"
                          placeholder="영문 회사 소개를 입력하세요"
                        />
                      </div>
                    </div>

                    <div className="admin-about-wrap">
                                              <h3>조직도
                                                  <br/><a style={{fontSize: "1.6rem", color: "black", textDecoration: "underline", fontWeight: "500"}} href="https://drive.google.com/file/d/1vciFmetRYtQvuJLgjQd07-_MMtPja2pp/view?usp=sharing" target="_blank">조직도 템플릿 다운로드</a>
                                              </h3>
                      {/* 조직도 이미지 (데스크탑) */}
                      <div className="admin-form-section">
                        <div className="admin-form-wrap">
                          <h4>데스크탑</h4>
                          <button
                            onClick={triggerOrgImageSelect}
                            disabled={uploading}
                            className="admin-button admin-button-secondary"
                          >
                            {uploading ? "업로드 중..." : "이미지 변경"}
                          </button>
                        </div>
                        <div className="admin-image-preview">
                          <img
                            src={companyInfo.organizationImage}
                            alt="조직도 데스크탑"
                            style={{ maxWidth: "100%", height: "auto" }}
                          />
                        </div>
                        <div className="admin-image-controls">
                          <input
                            ref={orgImageInputRef}
                            type="file"
                            accept="image/*"
                            onChange={(e) =>
                              handleImageUpload(
                                "organizationImage",
                                e.target.files[0]
                              )
                            }
                            style={{ display: "none" }}
                          />
                        </div>
                      </div>

                      {/* 조직도 이미지 (모바일) */}
                      <div className="admin-form-section">
                        <div className="admin-form-wrap">
                          <h4>모바일</h4>
                          <button
                            onClick={triggerOrgImageMoSelect}
                            disabled={uploading}
                            className="admin-button admin-button-secondary"
                          >
                            {uploading ? "업로드 중..." : "이미지 변경"}
                          </button>
                        </div>
                        <div className="admin-image-preview">
                          <img
                            src={companyInfo.organizationImageMo}
                            alt="조직도 모바일"
                            style={{ maxWidth: "40%", height: "auto" }}
                          />
                        </div>
                        <div className="admin-image-controls">
                          <input
                            ref={orgImageMoInputRef}
                            type="file"
                            accept="image/*"
                            onChange={(e) =>
                              handleImageUpload(
                                "organizationImageMo",
                                e.target.files[0]
                              )
                            }
                            style={{ display: "none" }}
                          />
                        </div>
                      </div>
                        </div>
                        </div>
                  </div>
                )}

                {/* CEO 정보 탭 */}
                {activeTab === "ceo" && (
                  <div className="admin-content-section" style={{paddingBottom: "0px"}}>
                    <div className="admin-content-header">
                      <h3 className="admin-content-title">대표 소개 관리</h3>
                      <button
                        className="admin-button admin-button-primary"
                        onClick={handleSaveCeoData}
                      >
                        저장
                      </button>
                    </div>

                      <div className="admin-about-container">
                    {/* 장윤규 정보 */}
                    <div className="admin-ceo-section">
                      <h4>장윤규 (Yoongyoo Jang)</h4>

                      <div className="admin-form-row">
                        <div className="admin-form-col">
                          <label>이름 (국문)</label>
                          <input
                            type="text"
                            value={ceoData.jang.nameKo}
                            onChange={(e) =>
                              updateCeoData("jang", "nameKo", e.target.value)
                            }
                            className="admin-input"
                          />
                        </div>
                        <div className="admin-form-col">
                          <label>이름 (영문)</label>
                          <input
                            type="text"
                            value={ceoData.jang.nameEn}
                            onChange={(e) =>
                              updateCeoData("jang", "nameEn", e.target.value)
                            }
                            className="admin-input"
                          />
                        </div>
                      </div>

                      <div className="admin-form-row">
                        <label>직책 (국문)</label>
                        <input
                          type="text"
                          value={ceoData.jang.title}
                          onChange={(e) =>
                            updateCeoData("jang", "title", e.target.value)
                          }
                          className="admin-input"
                        />
                      </div>

                      <div className="admin-form-row">
                        <label>직책 (영문)</label>
                        <input
                          type="text"
                          value={ceoData.jang.titleEn}
                          onChange={(e) =>
                            updateCeoData("jang", "titleEn", e.target.value)
                          }
                          className="admin-input"
                        />
                      </div>

                      <div className="admin-form-row">
                        <label>소개 (국문)</label>
                        <textarea
                          value={ceoData.jang.description}
                          onChange={(e) =>
                            updateCeoData("jang", "description", e.target.value)
                          }
                          className="admin-textarea"
                          rows="8"
                        />
                      </div>

                      <div className="admin-form-row">
                        <label>소개 (영문)</label>
                        <textarea
                          value={ceoData.jang.descriptionEn}
                          onChange={(e) =>
                            updateCeoData(
                              "jang",
                              "descriptionEn",
                              e.target.value
                            )
                          }
                          className="admin-textarea"
                          rows="8"
                        />
                      </div>
                    </div>

                    {/* 신창훈 정보 */}
                    <div className="admin-ceo-section">
                      <h4>신창훈 (Changhoon Shin)</h4>

                      <div className="admin-form-row">
                        <div className="admin-form-col">
                          <label>이름 (국문)</label>
                          <input
                            type="text"
                            value={ceoData.shin.nameKo}
                            onChange={(e) =>
                              updateCeoData("shin", "nameKo", e.target.value)
                            }
                            className="admin-input"
                          />
                        </div>
                        <div className="admin-form-col">
                          <label>이름 (영문)</label>
                          <input
                            type="text"
                            value={ceoData.shin.nameEn}
                            onChange={(e) =>
                              updateCeoData("shin", "nameEn", e.target.value)
                            }
                            className="admin-input"
                          />
                        </div>
                      </div>

                      <div className="admin-form-row">
                        <label>직책 (국문)</label>
                        <input
                          type="text"
                          value={ceoData.shin.title}
                          onChange={(e) =>
                            updateCeoData("shin", "title", e.target.value)
                          }
                          className="admin-input"
                        />
                      </div>

                      <div className="admin-form-row">
                        <label>직책 (영문)</label>
                        <input
                          type="text"
                          value={ceoData.shin.titleEn}
                          onChange={(e) =>
                            updateCeoData("shin", "titleEn", e.target.value)
                          }
                          className="admin-input"
                        />
                      </div>

                      <div className="admin-form-row">
                        <label>소개 (국문)</label>
                        <textarea
                          value={ceoData.shin.description}
                          onChange={(e) =>
                            updateCeoData("shin", "description", e.target.value)
                          }
                          className="admin-textarea"
                          rows="8"
                        />
                      </div>

                      <div className="admin-form-row">
                        <label>소개 (영문)</label>
                        <textarea
                          value={ceoData.shin.descriptionEn}
                          onChange={(e) =>
                            updateCeoData(
                              "shin",
                              "descriptionEn",
                              e.target.value
                            )
                          }
                          className="admin-textarea"
                          rows="8"
                        />
                      </div>
                        </div>
                        </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
