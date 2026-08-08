const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');
const Project = require('../models/Project');
const Task = require('../models/Task');
const Expense = require('../models/Expense');
const Worker = require('../models/Worker');
const Material = require('../models/Material');

exports.generateProjectReport = async (req, res, next) => {
  try {
    const project = await Project.findById(req.params.projectId)
      .populate('manager_id', 'name email');
    if (!project) return res.status(404).json({ message: 'Project not found.' });

    const tasks = await Task.find({ project_id: project._id });
    const expenses = await Expense.find({ project_id: project._id, approved_status: 'approved' });

    const doc = new PDFDocument({ margin: 50 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=project_report_${project._id}.pdf`);
    doc.pipe(res);

    // Header
    doc.fontSize(24).font('Helvetica-Bold').text('Project Report', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).font('Helvetica');

    // Project details
    doc.fontSize(16).font('Helvetica-Bold').text('Project Details');
    doc.moveDown(0.5);
    doc.fontSize(11).font('Helvetica');
    doc.text(`Name: ${project.project_name}`);
    doc.text(`Client: ${project.client_name}`);
    doc.text(`Location: ${project.location}`);
    doc.text(`Status: ${project.project_status}`);
    doc.text(`Progress: ${project.progress_percentage}%`);
    doc.text(`Budget: ₹${project.budget?.toLocaleString()}`);
    doc.text(`Manager: ${project.manager_id?.name || 'N/A'}`);
    doc.text(`Start Date: ${project.start_date ? new Date(project.start_date).toLocaleDateString() : 'N/A'}`);
    doc.text(`Expected End: ${project.expected_end_date ? new Date(project.expected_end_date).toLocaleDateString() : 'N/A'}`);
    doc.moveDown();

    // Task summary
    doc.fontSize(16).font('Helvetica-Bold').text('Task Summary');
    doc.moveDown(0.5);
    doc.fontSize(11).font('Helvetica');
    const tasksByStatus = {};
    tasks.forEach(t => { tasksByStatus[t.status] = (tasksByStatus[t.status] || 0) + 1; });
    Object.entries(tasksByStatus).forEach(([status, count]) => {
      doc.text(`${status}: ${count} tasks`);
    });
    doc.moveDown();

    // Expense summary
    doc.fontSize(16).font('Helvetica-Bold').text('Expense Summary');
    doc.moveDown(0.5);
    doc.fontSize(11).font('Helvetica');
    const totalExpense = expenses.reduce((sum, e) => sum + e.amount, 0);
    doc.text(`Total Approved Expenses: ₹${totalExpense.toLocaleString()}`);
    doc.text(`Budget Utilization: ${project.budget > 0 ? Math.round((totalExpense / project.budget) * 100) : 0}%`);

    doc.moveDown();
    doc.fontSize(9).fillColor('#888').text(`Generated on ${new Date().toLocaleString()}`, { align: 'center' });

    doc.end();
  } catch (error) { next(error); }
};

exports.generateExpenseReport = async (req, res, next) => {
  try {
    const { project_id, start_date, end_date } = req.query;
    const query = {};
    if (req.user.company_id) query.company_id = req.user.company_id;
    if (project_id) query.project_id = project_id;
    if (start_date || end_date) {
      query.date = {};
      if (start_date) query.date.$gte = new Date(start_date);
      if (end_date) query.date.$lte = new Date(end_date);
    }

    const expenses = await Expense.find(query)
      .populate('project_id', 'project_name')
      .populate('created_by', 'name')
      .sort({ date: -1 });

    const doc = new PDFDocument({ margin: 50 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=expense_report.pdf');
    doc.pipe(res);

    doc.fontSize(24).font('Helvetica-Bold').text('Expense Report', { align: 'center' });
    doc.moveDown();

    expenses.forEach(exp => {
      doc.fontSize(11).font('Helvetica');
      doc.text(`${new Date(exp.date).toLocaleDateString()} | ${exp.category} | ₹${exp.amount.toLocaleString()} | ${exp.approved_status} | ${exp.project_id?.project_name || 'N/A'}`);
    });

    doc.moveDown();
    const total = expenses.reduce((s, e) => s + e.amount, 0);
    doc.font('Helvetica-Bold').text(`Total: ₹${total.toLocaleString()}`);

    doc.end();
  } catch (error) { next(error); }
};

exports.generateWorkerExcel = async (req, res, next) => {
  try {
    const query = {};
    if (req.user.company_id) query.company_id = req.user.company_id;
    const workers = await Worker.find(query).populate('assigned_project', 'project_name');

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Workers');

    sheet.columns = [
      { header: 'Name', key: 'name', width: 25 },
      { header: 'Skill', key: 'skill', width: 20 },
      { header: 'Experience (yrs)', key: 'experience', width: 15 },
      { header: 'Salary', key: 'salary', width: 15 },
      { header: 'Salary Type', key: 'salary_type', width: 15 },
      { header: 'Availability', key: 'availability', width: 15 },
      { header: 'Assigned Project', key: 'project', width: 25 },
      { header: 'Attendance Days', key: 'attendance', width: 15 },
    ];

    // Style header
    sheet.getRow(1).font = { bold: true };
    sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E40AF' } };
    sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

    workers.forEach(w => {
      sheet.addRow({
        name: w.name,
        skill: w.skill,
        experience: w.experience,
        salary: w.salary,
        salary_type: w.salary_type,
        availability: w.availability,
        project: w.assigned_project?.project_name || 'Unassigned',
        attendance: w.attendance.length,
      });
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=workers_report.xlsx');
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) { next(error); }
};

exports.generateMaterialExcel = async (req, res, next) => {
  try {
    const query = {};
    if (req.user.company_id) query.company_id = req.user.company_id;
    const materials = await Material.find(query).populate('project_id', 'project_name');

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Materials');

    sheet.columns = [
      { header: 'Material', key: 'name', width: 25 },
      { header: 'Category', key: 'category', width: 20 },
      { header: 'Supplier', key: 'supplier', width: 20 },
      { header: 'Total Qty', key: 'quantity', width: 12 },
      { header: 'Available', key: 'available', width: 12 },
      { header: 'Used', key: 'used', width: 12 },
      { header: 'Unit', key: 'unit', width: 10 },
      { header: 'Cost', key: 'cost', width: 15 },
      { header: 'Project', key: 'project', width: 25 },
    ];

    sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E40AF' } };

    materials.forEach(m => {
      sheet.addRow({
        name: m.material_name,
        category: m.category,
        supplier: m.supplier,
        quantity: m.quantity,
        available: m.available_stock,
        used: m.used_stock,
        unit: m.unit,
        cost: m.cost,
        project: m.project_id?.project_name || 'N/A',
      });
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=materials_report.xlsx');
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) { next(error); }
};
