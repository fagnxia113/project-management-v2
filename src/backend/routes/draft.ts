import express from 'express';
import { FormDraftService } from '../services/FormDraftService';
import { jwtService } from '../utils/jwt';

const router = express.Router();
const draftService = new FormDraftService();

router.post('/save', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ success: false, error: '未授权' });
    }

    const decoded = jwtService.verifyToken(token);
    const userId = decoded.id;

    const { templateId, templateKey, formData, status, metadata } = req.body;

    if (!templateKey || !formData) {
      return res.status(400).json({ success: false, error: '缺少必要参数' });
    }

    const draft = await draftService.saveDraft({
      userId,
      templateId,
      templateKey,
      formData,
      status,
      metadata
    });

    res.json({ success: true, data: draft });
  } catch (error: any) {
    console.error('[DraftRoutes] 保存草稿失败:', error);
    res.status(500).json({ success: false, error: error.message || '保存草稿失败' });
  }
});

router.get('/list', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ success: false, error: '未授权' });
    }

    const decoded = jwtService.verifyToken(token);
    const userId = decoded.id;

    const { templateKey, status, page = 1, limit = 20 } = req.query;

    const result = await draftService.getUserDrafts({
      userId,
      templateKey: templateKey as string,
      status: status as 'draft' | 'auto_saved',
      page: parseInt(page as string),
      limit: parseInt(limit as string)
    });

    res.json({ success: true, data: result });
  } catch (error: any) {
    console.error('[DraftRoutes] 获取草稿列表失败:', error);
    res.status(500).json({ success: false, error: error.message || '获取草稿列表失败' });
  }
});

router.get('/:draftId', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ success: false, error: '未授权' });
    }

    const decoded = jwtService.verifyToken(token);
    const userId = decoded.id;

    const { draftId } = req.params;

    const draft = await draftService.getDraft(draftId);

    if (!draft) {
      return res.status(404).json({ success: false, error: '草稿不存在' });
    }

    if (draft.userId !== userId) {
      return res.status(403).json({ success: false, error: '无权访问此草稿' });
    }

    res.json({ success: true, data: draft });
  } catch (error: any) {
    console.error('[DraftRoutes] 获取草稿失败:', error);
    res.status(500).json({ success: false, error: error.message || '获取草稿失败' });
  }
});

router.delete('/:draftId', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ success: false, error: '未授权' });
    }

    const decoded = jwtService.verifyToken(token);
    const userId = decoded.id;

    const { draftId } = req.params;

    const success = await draftService.deleteDraft(draftId, userId);

    if (!success) {
      return res.status(404).json({ success: false, error: '草稿不存在或删除失败' });
    }

    res.json({ success: true, message: '删除成功' });
  } catch (error: any) {
    console.error('[DraftRoutes] 删除草稿失败:', error);
    res.status(500).json({ success: false, error: error.message || '删除草稿失败' });
  }
});

router.post('/:draftId/restore', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ success: false, error: '未授权' });
    }

    const decoded = jwtService.verifyToken(token);
    const userId = decoded.id;

    const { draftId } = req.params;

    const draft = await draftService.restoreDraft(draftId, userId);

    if (!draft) {
      return res.status(404).json({ success: false, error: '草稿不存在或无权访问' });
    }

    res.json({ success: true, data: draft });
  } catch (error: any) {
    console.error('[DraftRoutes] 恢复草稿失败:', error);
    res.status(500).json({ success: false, error: error.message || '恢复草稿失败' });
  }
});

export default router;
