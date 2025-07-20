// 유튜브 URL을 embed URL로 변환
export const convertYouTubeToEmbed = (url) => {
  // 다양한 유튜브 URL 형식 지원
  const youtubeRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
  const match = url.match(youtubeRegex);
  
  if (match) {
    const videoId = match[1];
    return `https://www.youtube.com/embed/${videoId}`;
  }
  
  return null;
};

// 비메오 URL을 embed URL로 변환
export const convertVimeoToEmbed = (url) => {
  const vimeoRegex = /(?:vimeo\.com\/)(?:.*\/)?(\d+)/;
  const match = url.match(vimeoRegex);
  
  if (match) {
    const videoId = match[1];
    return `https://player.vimeo.com/video/${videoId}`;
  }
  
  return null;
};

// URL이 유튜브인지 확인
export const isYouTubeUrl = (url) => {
  return /(?:youtube\.com|youtu\.be)/.test(url);
};

// URL이 비메오인지 확인
export const isVimeoUrl = (url) => {
  return /vimeo\.com/.test(url);
};

// URL을 적절한 embed URL로 변환
export const convertToEmbedUrl = (url) => {
  if (isYouTubeUrl(url)) {
    return convertYouTubeToEmbed(url);
  } else if (isVimeoUrl(url)) {
    return convertVimeoToEmbed(url);
  }
  
  // 이미 embed URL인 경우 그대로 반환
  if (url.includes('embed') || url.includes('player')) {
    return url;
  }
  
  return null;
};

// 비디오 플랫폼 감지
export const detectVideoPlatform = (url) => {
  if (isYouTubeUrl(url)) {
    return 'youtube';
  } else if (isVimeoUrl(url)) {
    return 'vimeo';
  }
  return 'unknown';
};

// URL 유효성 검사
export const isValidVideoUrl = (url) => {
  return isYouTubeUrl(url) || isVimeoUrl(url);
}; 