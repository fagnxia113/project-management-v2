/**
 * 流程表单集成API路由
 * 提供流程表单预设的管理和流程启动功能
 */

import express from 'express';
import { processFormIntegrationService } from '../services/ProcessFormIntegrationService.js';

const router = express.Router();

/**
 * 获取所有流程表单预设
 * GET /api/process-forms
 */
router.get('/', (req, res) => {
  try {
    const presets = processFormIntegrationService.getAllPresets();
    res.json({
      success: true,
      data: presets
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '获取流程表单预设失败',
      error: (error as Error).message
    });
  }
});

/**
 * 根据formKey获取表单字段
 * GET /api/process-forms/form/:formKey
 */
router.get('/form/:formKey', (req, res) => {
  try {
    const formKey = req.params.formKey;
    const formTemplate = processFormIntegrationService.getFormTemplate(formKey);
    
    if (!formTemplate) {
      res.status(404).json({
        success: false,
        message: '表单模板不存在'
      });
      return;
    }
    
    res.json({
      success: true,
      data: {
        id: formTemplate.id,
        key: formTemplate.key,
        name: formTemplate.name,
        fields: formTemplate.fields
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '获取表单模板失败',
      error: (error as Error).message
    });
  }
});

/**
 * 根据ID获取流程表单预设
 * GET /api/process-forms/:id
 */
router.get('/:id', (req, res) => {
  try {
    const preset = processFormIntegrationService.getPresetById(req.params.id);
    if (!preset) {
      res.status(404).json({
        success: false,
        message: '流程表单预设不存在'
      });
      return;
    }
    res.json({
      success: true,
      data: preset
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '获取流程表单预设失败',
      error: (error as Error).message
    });
  }
});

/**
 * 根据分类获取流程表单预设
 * GET /api/process-forms/category/:category
 */
router.get('/category/:category', (req, res) => {
  try {
    const presets = processFormIntegrationService.getPresetsByCategory(req.params.category);
    res.json({
      success: true,
      data: presets
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '获取流程表单预设失败',
      error: (error as Error).message
    });
  }
});

/**
 * 根据业务类型获取流程表单预设
 * GET /api/process-forms/business-type/:businessType
 */
router.get('/business-type/:businessType', (req, res) => {
  try {
    const presets = processFormIntegrationService.getPresetsByBusinessType(req.params.businessType);
    res.json({
      success: true,
      data: presets
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '获取流程表单预设失败',
      error: (error as Error).message
    });
  }
});

/**
 * 创建流程表单预设
 * POST /api/process-forms
 */
router.post('/', (req, res) => {
  try {
    const presetData = req.body;
    if (!presetData.name || !presetData.category || !presetData.formTemplateKey || !presetData.workflowTemplateId || !presetData.businessType) {
      res.status(400).json({
        success: false,
        message: '缺少必要的预设信息'
      });
      return;
    }

    const preset = processFormIntegrationService.createPreset({
      ...presetData,
      status: presetData.status || 'active',
      defaultVariables: presetData.defaultVariables || {}
    });

    res.json({
      success: true,
      data: preset
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '创建流程表单预设失败',
      error: (error as Error).message
    });
  }
});

/**
 * 更新流程表单预设
 * PUT /api/process-forms/:id
 */
router.put('/:id', (req, res) => {
  try {
    const preset = processFormIntegrationService.updatePreset(req.params.id, req.body);
    if (!preset) {
      res.status(404).json({
        success: false,
        message: '流程表单预设不存在'
      });
      return;
    }
    res.json({
      success: true,
      data: preset
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '更新流程表单预设失败',
      error: (error as Error).message
    });
  }
});

/**
 * 删除流程表单预设
 * DELETE /api/process-forms/:id
 */
router.delete('/:id', (req, res) => {
  try {
    const result = processFormIntegrationService.deletePreset(req.params.id);
    if (!result) {
      res.status(404).json({
        success: false,
        message: '流程表单预设不存在'
      });
      return;
    }
    res.json({
      success: true,
      message: '流程表单预设删除成功'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '删除流程表单预设失败',
      error: (error as Error).message
    });
  }
});

/**
 * 启动流程（包含表单验证）
 * POST /api/process-forms/:id/start
 */
router.post('/:id/start', async (req, res) => {
  try {
    const { formData, businessKey, businessId, title, initiator, additionalVariables } = req.body;
    const result = await processFormIntegrationService.startProcessWithForm({
      presetId: req.params.id,
      formData,
      businessKey,
      businessId,
      title,
      initiator,
      additionalVariables
    });
    if (result.success) {
      res.json({
        success: true,
        data: result.data,
        message: result.message
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.message,
        data: result.data
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '启动流程失败',
      error: (error as Error).message
    });
  }
});

/**
 * 获取流程表单的默认值
 * GET /api/process-forms/:id/default-values
 */
router.get('/:id/default-values', (req, res) => {
  try {
    const defaultValues = processFormIntegrationService.getFormDefaultValues(req.params.id);
    res.json({
      success: true,
      data: defaultValues
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '获取表单默认值失败',
      error: (error as Error).message
    });
  }
});

/**
 * 获取流程表单的字段定义
 * GET /api/process-forms/:id/form-fields
 */
router.get('/:id/form-fields', async (req, res) => {
  try {
    const formFields = await processFormIntegrationService.getFormFields(req.params.id);
    res.json({
      success: true,
      data: formFields
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '获取表单字段失败',
      error: (error as Error).message
    });
  }
});

export default router;
