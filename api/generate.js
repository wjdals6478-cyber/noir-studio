export default async function handler(req, res) {
  const FAL_KEY = process.env.FAL_KEY;
  if (!FAL_KEY) {
    return res.status(500).json({ error: "FAL_KEY가 Vercel 환경 변수에 설정되지 않았습니다." });
  }

  const checkIsLocked = (status, data) => {
    const dataStr = JSON.stringify(data || {});
    return (
      status === 403 || 
      data?.code === 'TOP_UP' || 
      dataStr.includes('locked') || 
      dataStr.includes('TOP_UP')
    );
  };

  const lockedErrorResponse = {
    error: 'API_ACCOUNT_LOCKED',
    message: 'Fal.ai 크레딧이 부족하거나 계정이 잠겼습니다. 대시보드를 확인해주세요.'
  };

  try {
    // 1. GET 요청 (비디오 생성 상태 폴링 및 결과 조회)
    if (req.method === 'GET') {
      const endpoint = req.query.endpoint;
      if (!endpoint) {
        return res.status(400).json({ error: "Endpoint is required for GET requests" });
      }

      // 절대 URL이거나 큐 상태 조회 주소인 경우 그대로 전달
      const targetUrl = endpoint.startsWith('http') ? endpoint : `https://queue.fal.run${endpoint}`;
      
      const response = await fetch(targetUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Key ${FAL_KEY}`,
          'Accept': 'application/json'
        }
      });
      
      const data = await response.json().catch(() => ({}));

      if (checkIsLocked(response.status, data)) {
        return res.status(403).json(lockedErrorResponse);
      }

      return res.status(response.status).json(data);
    }

    // 2. POST 요청 (이미지 및 비디오 생성 요청)
    if (req.method === 'POST') {
      const { endpoint, bodyData } = req.body;
      if (!endpoint) {
        return res.status(400).json({ error: "Endpoint is missing in request body" });
      }

      // 비디오 및 큐 모델은 queue.fal.run 사용, 이미지는 fal.run 사용
      const isQueueModel = endpoint.includes('minimax') || endpoint.includes('video') || endpoint.includes('queue');
      const baseUrl = isQueueModel ? 'https://queue.fal.run' : 'https://fal.run';

      const response = await fetch(`${baseUrl}${endpoint}`, {
        method: 'POST',
        headers: {
          'Authorization': `Key ${FAL_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(bodyData || {})
      });

      const data = await response.json().catch(() => ({}));

      if (checkIsLocked(response.status, data)) {
        return res.status(403).json(lockedErrorResponse);
      }

      return res.status(response.status).json(data);
    }

    return res.status(405).json({ error: "Method not allowed" });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

