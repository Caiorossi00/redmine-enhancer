// ==UserScript==
// @name         Redmine Enhancer
// @namespace    https://github.com/Caiorossi00/redmine-enhancer
// @version      1.0.0
// @description  Melhorias na página Minhas tarefas do Redmine
// @match        */redmine/my/page*
// @run-at       document-idle
// ==/UserScript==

(() => {
  'use strict';

  function getTasks() {
    const container = document.querySelector('.mypage-box');
    const table = container?.querySelector('table.list.issues');

    if (!table) {
      console.log('[Redmine Enhancer] Tabela não encontrada');
      return [];
    }

    const rows = [...table.querySelectorAll('tbody tr.issue')];

    return rows.map((row) => {
      const subject = row.querySelector('.subject');
      const link = subject?.querySelector('a');

      return {
        id: Number(row.id.replace('issue-', '')),
        project: row.querySelector('.project')?.textContent.trim(),
        tracker: row.querySelector('.tracker')?.textContent.trim(),
        subject: link?.textContent.trim(),
        status: subject?.textContent
          .replace(link?.textContent || '', '')
          .trim()
          .replace(/^\(|\)$/g, ''),
        url: link?.href,
      };
    });
  }

  async function getTaskDetails(url) {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Erro ao consultar ${url}: ${response.status}`);
    }

    const html = await response.text();
    const documentPage = new DOMParser().parseFromString(html, 'text/html');

    const subject = documentPage.querySelector('.subject h3');
    const priority = documentPage.querySelector('td.priority');
    const startDate = documentPage.querySelector('td.start-date');

    return {
      subject: subject?.textContent.trim(),
      priority: priority?.textContent.trim(),
      startDate: startDate?.textContent.trim(),
    };
  }

  async function updateTaskSubjects(tasks) {
    for (const task of tasks) {
      try {
        const details = await getTaskDetails(task.url);

        task.subject = details.subject;
        task.priority = details.priority;
        task.startDate = details.startDate;

        const row = document.querySelector(`#issue-${task.id}`);
        const subjectLink = row?.querySelector('.subject a');

        if (subjectLink && details.subject) {
          subjectLink.textContent = details.subject;

          const subjectCell = row.querySelector('.subject');

          subjectCell.childNodes.forEach((node) => {
            if (node.nodeType === Node.TEXT_NODE) {
              node.remove();
            }
          });
        }
      } catch (error) {
        console.error(`[Redmine Enhancer] Erro na tarefa ${task.id}:`, error);
      }
    }

    console.log('[Redmine Enhancer] Tarefas atualizadas:', tasks);
  }

  function addStyles() {
    const style = document.createElement('style');

    style.textContent = `
        .mypage-box table.list.issues {
          width: 100%;
          table-layout: auto;
          border-collapse: separate;
          border-spacing: 0;
        }

        .mypage-box table.list.issues th,
        .mypage-box table.list.issues td {
          padding: 12px 14px;
          vertical-align: middle;
        }

        .mypage-box table.list.issues thead th {
          font-weight: 600;
        }

        .mypage-box table.list.issues tbody tr {
          transition: background-color 0.15s ease;
        }

        .mypage-box table.list.issues tbody tr:hover {
          background-color: #f1f5f9;
        }

        .mypage-box table.list.issues td.subject {
          width: 450px;
          min-width: 450px;
          max-width: 450px;
          white-space: normal;
          overflow-wrap: anywhere;
          line-height: 1.5;
        }

        .mypage-box table.list.issues td.subject a {
          white-space: normal;
          font-weight: 500;
        }

        .mypage-box table.list.issues th.priority-column,
        .mypage-box table.list.issues td.priority-column,
        .mypage-box table.list.issues th.status-column,
        .mypage-box table.list.issues td.status-column,
        .mypage-box table.list.issues th.start-date-column,
        .mypage-box table.list.issues td.start-date-column,
        .mypage-box table.list.issues th.id,
        .mypage-box table.list.issues td.id,
        .mypage-box table.list.issues th.project,
        .mypage-box table.list.issues td.project,
        .mypage-box table.list.issues th.tracker,
        .mypage-box table.list.issues td.tracker {
          width: 1%;
          white-space: nowrap;
        }

        .priority-indicator {
          display: inline-block;
          width: 9px;
          height: 9px;
          border-radius: 50%;
          margin-right: 8px;
        }

        .priority-high {
          background-color: #dc2626;
        }

        .priority-normal {
          background-color: #2563eb;
        }

        .priority-low {
          background-color: #16a34a;
        }

        .status-badge {
          display: inline-block;
          padding: 4px 9px;
          border-radius: 5px;
          font-size: 12px;
          font-weight: 500;
          white-space: nowrap;
        }

        .status-success {
          background-color: #dcfce7;
          color: #166534;
        }

        .status-warning {
          background-color: #fef3c7;
          color: #92400e;
        }

        .status-info {
          background-color: #dbeafe;
          color: #1e40af;
        }

        .status-danger {
          background-color: #fee2e2;
          color: #991b1b;
        }

        .status-default {
          background-color: #f1f5f9;
          color: #475569;
        }

        .start-date-column {
          white-space: nowrap;
          color: #64748b;
          font-size: 13px;
        }

        .mypage-box table.list.issues th.sortable {
          cursor: pointer;
          user-select: none;
          white-space: nowrap;
        }

        .mypage-box table.list.issues th.sortable::after {
          content: ' ↕';
          color: #94a3b8;
          font-size: 11px;
        }

        .mypage-box table.list.issues th.sortable[data-sort-direction="asc"]::after {
          content: ' ↑';
          color: #000000;
        }

        .mypage-box table.list.issues th.sortable[data-sort-direction="desc"]::after {
          content: ' ↓';
          color: #000000;
        }
      `;

    document.head.appendChild(style);
  }

  function getStatusClass(status) {
    const value = status?.toLowerCase() || '';

    if (
      value.includes('concluído') ||
      value.includes('concluido') ||
      value.includes('fechado') ||
      value.includes('finalizado')
    ) {
      return 'status-success';
    }

    if (value.includes('aguardando') || value.includes('pendente')) {
      return 'status-warning';
    }

    if (value.includes('andamento') || value.includes('desenvolvimento')) {
      return 'status-info';
    }

    if (value.includes('cancelado') || value.includes('rejeitado') || value.includes('impedido')) {
      return 'status-danger';
    }

    return 'status-default';
  }

  function updateTableUI(tasks) {
    const table = document.querySelector('.mypage-box table.list.issues');
    const headerRow = table?.querySelector('thead tr');

    if (!table || !headerRow) {
      return;
    }

    if (headerRow.querySelector('.enhancer-column')) {
      return;
    }

    const columns = [
      { label: 'Prioridade', className: 'priority-column' },
      { label: 'Status', className: 'status-column' },
      { label: 'Início', className: 'start-date-column' },
    ];

    columns.forEach((column) => {
      const th = document.createElement('th');
      th.textContent = column.label;
      th.className = `enhancer-column ${column.className}`;

      if (column.className === 'priority-column') {
        headerRow.insertBefore(th, headerRow.firstChild);
      } else {
        headerRow.appendChild(th);
      }
    });

    tasks.forEach((task) => {
      const row = document.querySelector(`#issue-${task.id}`);

      if (!row) {
        return;
      }

      const priorityCell = document.createElement('td');
      priorityCell.className = 'priority-column';

      const priorityIndicator = document.createElement('span');
      const priority = task.priority?.toLowerCase() || '';

      let priorityClass = 'priority-normal';

      if (priority.includes('alta') || priority.includes('urgente')) {
        priorityClass = 'priority-high';
      } else if (priority.includes('baixa')) {
        priorityClass = 'priority-low';
      }

      priorityIndicator.className = `priority-indicator ${priorityClass}`;
      priorityCell.appendChild(priorityIndicator);
      priorityCell.append(task.priority || '-');

      const statusCell = document.createElement('td');
      statusCell.className = 'status-column';

      const statusBadge = document.createElement('span');
      statusBadge.className = `status-badge ${getStatusClass(task.status)}`;
      statusBadge.textContent = task.status || '-';
      statusCell.appendChild(statusBadge);

      const startDateCell = document.createElement('td');
      startDateCell.className = 'start-date-column';
      startDateCell.textContent = task.startDate || '-';

      row.insertBefore(priorityCell, row.firstChild);
      row.append(statusCell, startDateCell);
    });

    enableTableSorting(table, headerRow);
  }

  function enableTableSorting(table, headerRow) {
    const headers = [...headerRow.querySelectorAll('th')];
    const tbody = table.querySelector('tbody');

    if (!tbody) {
      return;
    }

    const priorityOrder = {
      baixa: 1,
      normal: 2,
      alta: 3,
      urgente: 4,
      imediata: 5,
    };

    function getCellValue(row, index) {
      return row.cells[index]?.textContent.trim() || '';
    }

    function compareValues(a, b, header, direction) {
      const valueA = a.trim();
      const valueB = b.trim();

      if (!valueA && !valueB) return 0;
      if (!valueA) return 1;
      if (!valueB) return -1;

      const columnClass = header.className;

      if (columnClass.includes('priority-column')) {
        const priorityA = priorityOrder[valueA.toLowerCase()];
        const priorityB = priorityOrder[valueB.toLowerCase()];

        if (priorityA !== undefined && priorityB !== undefined) {
          return (priorityA - priorityB) * direction;
        }
      }

      if (columnClass.includes('start-date-column')) {
        const parseDate = (value) => {
          const [day, month, year] = value.split('/').map(Number);
          return new Date(year, month - 1, day).getTime();
        };

        return (parseDate(valueA) - parseDate(valueB)) * direction;
      }

      if (header.classList.contains('id')) {
        return (Number(valueA) - Number(valueB)) * direction;
      }

      return (
        valueA.localeCompare(valueB, 'pt-BR', {
          numeric: true,
          sensitivity: 'base',
        }) * direction
      );
    }

    headers.forEach((header) => {
      const isSortable =
        header.classList.contains('priority-column') ||
        header.classList.contains('id') ||
        header.classList.contains('status-column') ||
        header.classList.contains('start-date-column');

      if (!isSortable) {
        return;
      }

      header.classList.add('sortable');
      header.title = 'Clique para ordenar';

      header.addEventListener('click', (event) => {
        event.preventDefault();

        const currentDirection = header.dataset.sortDirection;
        const direction = currentDirection === 'asc' ? -1 : 1;
        const directionName = direction === 1 ? 'asc' : 'desc';

        headers.forEach((item) => {
          delete item.dataset.sortDirection;
        });

        header.dataset.sortDirection = directionName;

        const columnIndex = headers.indexOf(header);
        const rows = [...tbody.querySelectorAll('tr.issue')];

        const sortedRows = rows
          .map((row, index) => ({ row, index }))
          .sort((a, b) => {
            const valueA = getCellValue(a.row, columnIndex);
            const valueB = getCellValue(b.row, columnIndex);

            const result = compareValues(valueA, valueB, header, direction);

            return result || a.index - b.index;
          });

        sortedRows.forEach(({ row }) => {
          tbody.appendChild(row);
        });
      });
    });
  }

  async function init() {
    addStyles();

    const tasks = getTasks();

    console.log('[Redmine Enhancer] Tarefas encontradas:', tasks);

    await updateTaskSubjects(tasks);

    updateTableUI(tasks);
  }

  init();
})();
