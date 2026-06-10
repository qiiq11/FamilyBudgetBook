import db from '../db.js';

/**
 * Middleware: ensure the current user belongs to the specified group.
 * Expects group ID from header X-Group-Id or query param groupId.
 * Attaches req.groupMember with { group_id, user_id, role, can_manage_permissions }.
 */
export function requireGroup(req, res, next) {
  const groupId = req.headers['x-group-id'] || req.query.groupId;
  if (!groupId) {
    return res.status(400).json({ message: '请先选择一个家庭组' });
  }

  const member = db.prepare(
    'SELECT group_id, user_id, role, can_manage_permissions FROM group_members WHERE group_id = ? AND user_id = ?'
  ).get(Number(groupId), req.user.id);

  if (!member) {
    return res.status(403).json({ message: '您不是该家庭组的成员' });
  }

  req.groupMember = member;
  next();
}

/**
 * Middleware factory: require the current user to have one of the specified roles.
 * Must be used after requireGroup.
 */
export function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.groupMember.role)) {
      return res.status(403).json({ message: '权限不足，您无法执行此操作' });
    }
    next();
  };
}

/**
 * Check if user can manage permissions (creator always can, admin only with flag).
 * Must be used after requireGroup.
 */
export function requireManagePermissions(req, res, next) {
  const { role, can_manage_permissions } = req.groupMember;
  if (role === 'creator' || (role === 'admin' && can_manage_permissions)) {
    return next();
  }
  return res.status(403).json({ message: '权限不足，您无法管理成员权限' });
}

/**
 * Check if user can write (create/edit/delete) data.
 * Creator and admin can write, member cannot.
 * Must be used after requireGroup.
 */
export function requireWrite(req, res, next) {
  if (req.groupMember.role === 'member') {
    return res.status(403).json({ message: '权限不足，您只有查看权限' });
  }
  next();
}
