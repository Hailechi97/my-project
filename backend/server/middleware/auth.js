export const isAuthenticated = (req, res, next) => {
  if (!req.session.user) {
    return res.status(401).json({ message: "Chưa đăng nhập" });
  }
  next();
};
