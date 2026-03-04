import express from 'express';
import { formTemplateService } from '../services/FormTemplateService.js';
import { definitionService } from '../services/DefinitionService.js';

const router = express.Router();

router.post('/templates', async (req, res) => {
  try {
    const template = await formTemplateService.createTemplate(req.body);
    res.json({
      success: true,
      data: template
    });
  } catch (error) {
    console.error('创建表单模板失败:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '创建表单模板失败'
    });
  }
});

router.get('/templates', async (req, res) => {
  try {
    const templates = await formTemplateService.listTemplates();
    res.json({
      success: true,
      data: templates
    });
  } catch (error) {
    console.error('获取表单模板列表失败:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '获取表单模板列表失败'
    });
  }
});

router.get('/templates/:id', async (req, res) => {
  try {
    const template = await formTemplateService.getTemplate(req.params.id);
    if (!template) {
      return res.status(404).json({
        success: false,
        error: '表单模板不存在'
      });
    }
    res.json({
      success: true,
      data: template
    });
  } catch (error) {
    console.error('获取表单模板失败:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '获取表单模板失败'
    });
  }
});

router.put('/templates/:id', async (req, res) => {
  try {
    const template = await formTemplateService.updateTemplate(req.params.id, req.body);
    res.json({
      success: true,
      data: template
    });
  } catch (error) {
    console.error('更新表单模板失败:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '更新表单模板失败'
    });
  }
});

router.delete('/templates/:id', async (req, res) => {
  try {
    await formTemplateService.deleteTemplate(req.params.id);
    res.json({
      success: true,
      message: '表单模板已删除'
    });
  } catch (error) {
    console.error('删除表单模板失败:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '删除表单模板失败'
    });
  }
});

router.post('/validate', async (req, res) => {
  try {
    const { templateId, data, nodeId } = req.body;
    
    const template = await formTemplateService.getTemplate(templateId);
    if (!template) {
      return res.status(404).json({
        success: false,
        error: '表单模板不存在'
      });
    }

    const result = formTemplateService.validateFormData(template, data, nodeId);
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('验证表单数据失败:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '验证表单数据失败'
    });
  }
});

router.get('/workflow/:definitionId', async (req, res) => {
  try {
    const definition = await definitionService.getDefinition(req.params.definitionId);
    if (!definition) {
      return res.status(404).json({
        success: false,
        error: '流程定义不存在'
      });
    }

    if (!definition.form_template_id) {
      return res.json({
        success: true,
        data: null,
        message: '该流程未绑定表单模板'
      });
    }

    const template = await formTemplateService.getTemplate(definition.form_template_id);
    res.json({
      success: true,
      data: template
    });
  } catch (error) {
    console.error('获取流程表单模板失败:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '获取流程表单模板失败'
    });
  }
});

export default router;
