export const isAuthenticated = (req, res, next) => {
  console.log("Checking session for", req.url, ":", req.session); // Debug
  if (req.session.user) {
    console.log("Authenticated user:", req.session.user);
    return next();
  }
  console.log("Not authenticated for", req.url);
  res.status(401).json({ message: "Chưa đăng nhập" });
};
