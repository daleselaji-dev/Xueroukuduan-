# Remark42 部署指南

Remark42 是一个自托管的轻量论坛/评论系统。群友不需要 GitHub 账号，用邮箱或匿名就能发帖。

## 快速部署（5 分钟）

### 1. 准备服务器

需要一台有公网 IP 的服务器（VPS），安装 Docker 和 Docker Compose。

### 2. 下载配置

```bash
git clone https://github.com/BoHuYeShan/flesh-is-weak-seminar.git
cd flesh-is-weak-seminar/remark42
```

### 3. 修改配置

编辑 `docker-compose.yml`，修改以下内容：

```yaml
# 改为你的域名或 IP
- REMARK_URL=https://remark42.example.com

# 生成一个随机密钥
- SECRET=你的随机密钥  # 运行 openssl rand -hex 32 生成

# SMTP 邮箱配置（用于邮箱登录）
- SMTP_HOST=smtp.example.com
- SMTP_USERNAME=remark42@example.com
- SMTP_PASSWORD=你的邮箱密码
```

### 4. 启动

```bash
docker-compose up -d
```

访问 `http://你的IP:8080` 看到 Remark42 页面就成功了。

### 5. 配置 Nginx 反向代理（推荐）

```nginx
server {
    listen 443 ssl;
    server_name remark42.example.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### 6. 连接到主站

在主站仓库的 GitHub Secrets 中添加：

- `REMARK42_URL` = `https://remark42.example.com`
- `REMARK42_SITE` = `seminar`（或保持默认 `default`）

然后取消 `deploy.yml` 中 Remark42 步骤的注释，重新部署。

## 常用操作

### 访问管理后台

访问 `https://remark42.example.com/admin`，用配置的邮箱登录。

### 查看日志

```bash
docker-compose logs -f
```

### 停止服务

```bash
docker-compose down
```

### 数据备份

数据自动保存在 `./data` 目录。备份这个目录即可。

## 登录方式

| 方式 | 说明 | 配置 |
|------|------|------|
| 邮箱 | 群友输入邮箱，收到验证码登录 | 默认启用 |
| 匿名 | 不需要任何账号，直接发帖 | 默认启用 |
| GitHub | 有 GitHub 账号的群友 | 可选，需要 OAuth 配置 |

## 更多信息

- 官方文档：https://remark42.com/docs/configuration/authorization
- GitHub：https://github.com/umputun/remark42
