-- ===================================================
-- Python 变量专题学习网站 - 数据库初始化脚本
-- 适用：MySQL 8.0+
-- ===================================================

-- 1. 创建数据库
CREATE DATABASE IF NOT EXISTS python_var_lesson
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE python_var_lesson;

-- ===================================================
-- 2. 学生用户表
-- ===================================================
CREATE TABLE IF NOT EXISTS students (
    id          INT AUTO_INCREMENT PRIMARY KEY COMMENT '学生唯一编号',
    username    VARCHAR(50)  NOT NULL UNIQUE COMMENT '登录用户名',
    password    VARCHAR(64)  NOT NULL COMMENT '密码（SHA256 哈希）',
    display_name VARCHAR(50) NOT NULL COMMENT '真实姓名/显示名称',
    class_name  VARCHAR(50)  DEFAULT '' COMMENT '班级',
    created_at  DATETIME     DEFAULT CURRENT_TIMESTAMP COMMENT '注册时间',
    INDEX idx_username (username)
) ENGINE=InnoDB COMMENT='学生用户信息表';

-- ===================================================
-- 3. 学习模块进度表
-- ===================================================
CREATE TABLE IF NOT EXISTS learning_progress (
    id          INT AUTO_INCREMENT PRIMARY KEY COMMENT '记录编号',
    student_id  INT          NOT NULL COMMENT '学生编号（外键）',
    module_id   VARCHAR(30)  NOT NULL COMMENT '模块标识（如 intro, lesson, lab）',
    completed   TINYINT(1)   DEFAULT 1 COMMENT '是否完成（1=完成）',
    score       INT          DEFAULT 0 COMMENT '得分（如小测分数，0表示无得分模块）',
    completed_at DATETIME    DEFAULT CURRENT_TIMESTAMP COMMENT '完成时间',
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    UNIQUE KEY uk_student_module (student_id, module_id)
) ENGINE=InnoDB COMMENT='学生学习进度表';

-- ===================================================
-- 4. 成就记录表
-- ===================================================
CREATE TABLE IF NOT EXISTS achievements (
    id              INT AUTO_INCREMENT PRIMARY KEY COMMENT '记录编号',
    student_id      INT          NOT NULL COMMENT '学生编号（外键）',
    achievement_id  VARCHAR(30)  NOT NULL COMMENT '成就标识（如 beginner, judge）',
    earned_at       DATETIME     DEFAULT CURRENT_TIMESTAMP COMMENT '获得时间',
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    UNIQUE KEY uk_student_ach (student_id, achievement_id)
) ENGINE=InnoDB COMMENT='学生成就记录表';

-- ===================================================
-- 5. 登录记录表
-- ===================================================
CREATE TABLE IF NOT EXISTS login_logs (
    id          INT AUTO_INCREMENT PRIMARY KEY COMMENT '记录编号',
    student_id  INT      NOT NULL COMMENT '学生编号（外键）',
    login_time  DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '登录时间',
    ip_address  VARCHAR(45) DEFAULT '' COMMENT 'IP 地址',
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    INDEX idx_student_date (student_id, login_time)
) ENGINE=InnoDB COMMENT='学生登录日志表';

-- ===================================================
-- 6. 插入测试数据（可选）
-- ===================================================
INSERT IGNORE INTO students (username, password, display_name, class_name) VALUES
  ('test001', SHA2('1234', 256), '张三', '初一(3)班'),
  ('test002', SHA2('1234', 256), '李四', '初一(3)班');