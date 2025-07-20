import React, { useState, useEffect } from 'react';
import { getAboutInfo } from '../services/aboutService';
import './About.css';

const About = () => {
  const [aboutData, setAboutData] = useState({
    storyText: '',
    email: '',
    instagram: '',
    anotherProjects: [],
    partners: ''
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAboutInfo();
  }, []);

  const fetchAboutInfo = async () => {
    try {
      setLoading(true);
      const data = await getAboutInfo();
      setAboutData(data);
    } catch (error) {
      console.error('About 정보 로딩 실패:', error);
      // 오류 발생 시 기본값 사용
      setAboutData({
        storyText: `서울에서 만들어진 그래픽 디자인 스튜디오 어랏은, 의뢰 프로젝트에 대한 깊은 이해를 바탕으로
            웹사이트, 그래픽, 모션, 에디토리얼 등 다양한 시각적 결과물을 고민하고 제안합니다.
            시선을 끄는 글, 흥미로운 코드, 기분좋은 그래픽을 신조로, 생각에서 출발한 디자인이
            소비자에게 도착하기까지의 모든 과정을 연구합니다.`,
        email: 'contact@alolot.kr',
        instagram: 'https://www.instagram.com/alolot.kr/',
        anotherProjects: [],
        partners: ''
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="about-container">
        <div className="about-content">
          <p>로딩 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="about-container">
      <div className="about-content">
        <section className="about-story">
          <p>{aboutData.storyText}</p>
        </section>

        <section className="contact">
            <div className="email">
              <h3>이메일</h3>
              <p><a 
                href={`mailto:${aboutData.email}`} 
                >{aboutData.email}</a></p>
            </div>
            <div className="instagram">
              <h3>인스타그램</h3>
              <p><a 
                href={aboutData.instagram} 
                target="_blank" 
                rel="noopener noreferrer"
                >@alolot.kr</a></p>
            </div>
        </section>

        {aboutData.anotherProjects && aboutData.anotherProjects.length > 0 && (
          <section className="another-projects">
            <h3>수록되지 않은 프로젝트</h3>
            {aboutData.anotherProjects.map((project, index) => (
              <p key={index}>{project}</p>
            ))}
          </section>
        )}

        {aboutData.partners && (
          <section className="partners">
            <h3>함께해주신 분들</h3>
            <p>{aboutData.partners}</p>
          </section>
        )}
      </div>
    </div>
  );
};

export default About; 