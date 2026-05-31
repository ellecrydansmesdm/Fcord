const std = @import("std");

const gpa = std.heap.page_allocator;
var io_backend = std.Io.Threaded.init_single_threaded;
const DIST_ZIP = "nightcord-dist.zip";
const RELEASE_API = "https://git.nightcord.su/api/v1/repos/nightcord/nightcord/releases/latest";
const USER_AGENT = "Nightcord-Installer-Zig/1.0";

const Action = enum {
    install,
    uninstall,
    repair,
};

const Channel = struct {
    name: []const u8,
    dir_name: []const u8,
};

const DiscordInstall = struct {
    channel_name: []const u8,
    version: []const u8,
    resources_path: []u8,
};

const ReleaseAsset = struct {
    name: []const u8,
    browser_download_url: []const u8,
};

const ReleaseResponse = struct {
    tag_name: []const u8,
    assets: []ReleaseAsset,
};

const channels = [_]Channel{
    .{ .name = "Discord", .dir_name = "Discord" },
    .{ .name = "Discord PTB", .dir_name = "DiscordPTB" },
    .{ .name = "Discord Canary", .dir_name = "DiscordCanary" },
    .{ .name = "Discord Dev", .dir_name = "DiscordDevelopment" },
};

pub fn main(init: std.process.Init.Minimal) !void {
    var arena = std.heap.ArenaAllocator.init(gpa);
    defer arena.deinit();
    const allocator = arena.allocator();

    const action = try parseActionFromArgs(init.args);
    try printBanner();

    const local_app_data = try getRequiredEnv(allocator, "LOCALAPPDATA");
    const install_root = try std.fs.path.join(allocator, &.{ local_app_data, "Nightcord" });
    const dist_dir = try std.fs.path.join(allocator, &.{ install_root, "dist" });

    switch (action) {
        .install => try runInstall(allocator, install_root, dist_dir),
        .uninstall => try runUninstallOrRepair(allocator, .uninstall),
        .repair => try runUninstallOrRepair(allocator, .repair),
    }
}

fn parseAction(maybe_action: []const u8) !Action {
    if (std.mem.eql(u8, maybe_action, "install")) return .install;
    if (std.mem.eql(u8, maybe_action, "uninstall")) return .uninstall;
    if (std.mem.eql(u8, maybe_action, "repair")) return .repair;

    return error.InvalidAction;
}

fn parseActionFromArgs(args: std.process.Args) !Action {
    var it = try std.process.Args.Iterator.initAllocator(args, gpa);
    defer it.deinit();

    _ = it.next();
    const maybe_action = it.next() orelse return error.MissingAction;
    return parseAction(std.mem.trim(u8, maybe_action, " \r\n\t\""));
}

fn printBanner() !void {
    std.debug.print(
        "\n" ++
            "========================================\n" ++
            " Nightcord Installer Zig\n" ++
            " Windows terminal only\n" ++
            "========================================\n\n",
        .{},
    );
}

fn runInstall(allocator: std.mem.Allocator, install_root: []const u8, dist_dir: []const u8) !void {
    std.debug.print("[1/6] Préparation des dossiers...\n", .{});
    try makePath(install_root);
    try makePath(dist_dir);

    std.debug.print("[2/6] Téléchargement des métadonnées de release...\n", .{});
    const release = try fetchLatestRelease(allocator);
    const zip_url = try findAssetUrl(release, DIST_ZIP);

    std.debug.print("[3/6] Téléchargement de {s}...\n", .{release.tag_name});
    const zip_path = try std.fs.path.join(allocator, &.{ install_root, DIST_ZIP });
    try downloadFilePowerShell(zip_url, zip_path);

    std.debug.print("[4/6] Extraction de nightcord-dist.zip...\n", .{});
    try resetDirectory(dist_dir);
    try expandArchivePowerShell(zip_path, dist_dir);
    try deleteIfExists(zip_path);

    std.debug.print("[5/6] Détection de Discord...\n", .{});
    const installs = try detectDiscordInstalls(allocator);
    if (installs.items.len == 0) return error.DiscordNotFound;

    try printInstalls(installs.items);
    const selected = try promptInstallSelection(installs.items);

    std.debug.print("[6/6] Injection dans {s} {s}...\n", .{ selected.channel_name, selected.version });
    try injectIntoDiscord(allocator, dist_dir, selected.resources_path);

    std.debug.print("\nSuccès. Nightcord est installé.\n", .{});
}

fn runUninstallOrRepair(allocator: std.mem.Allocator, action: Action) !void {
    const installs = try detectDiscordInstalls(allocator);
    if (installs.items.len == 0) return error.DiscordNotFound;

    try printInstalls(installs.items);
    const selected = try promptInstallSelection(installs.items);

    switch (action) {
        .uninstall => {
            std.debug.print("Suppression de Nightcord sur {s} {s}...\n", .{ selected.channel_name, selected.version });
            try uninjectFromDiscord(allocator, selected.resources_path);
            std.debug.print("Succès. Nightcord est désinstallé.\n", .{});
        },
        .repair => {
            std.debug.print("Réparation de Nightcord sur {s} {s}...\n", .{ selected.channel_name, selected.version });
            try restartDiscordForResources(selected.resources_path);
            std.debug.print("Succès. Nightcord a été relancé.\n", .{});
        },
        else => unreachable,
    }
}

fn fetchLatestRelease(allocator: std.mem.Allocator) !ReleaseResponse {
    const uri = try std.Uri.parse(RELEASE_API);
    var client = std.http.Client{ .allocator = allocator, .io = getIo() };
    defer client.deinit();

    const extra_headers = [_]std.http.Header{
        .{ .name = "user-agent", .value = USER_AGENT },
        .{ .name = "accept", .value = "application/json" },
    };

    var req = try client.request(.GET, uri, .{ .extra_headers = &extra_headers });
    defer req.deinit();
    try req.sendBodiless();

    var redirect_buffer: [8192]u8 = undefined;
    var response = try req.receiveHead(&redirect_buffer);
    if (response.head.status != .ok) return error.ReleaseApiFailed;

    var transfer_buffer: [8192]u8 = undefined;
    var reader = response.reader(&transfer_buffer);
    const body = try reader.allocRemaining(allocator, .limited(16 * 1024 * 1024));
    return try std.json.parseFromSliceLeaky(ReleaseResponse, allocator, body, .{ .ignore_unknown_fields = true });
}

fn findAssetUrl(release: ReleaseResponse, asset_name: []const u8) ![]const u8 {
    for (release.assets) |asset| {
        if (std.mem.eql(u8, asset.name, asset_name)) return asset.browser_download_url;
    }
    return error.AssetNotFound;
}

fn detectDiscordInstalls(allocator: std.mem.Allocator) !std.ArrayList(DiscordInstall) {
    var installs: std.ArrayList(DiscordInstall) = .empty;
    const local_app_data = try getRequiredEnv(allocator, "LOCALAPPDATA");

    for (channels) |channel| {
        const base_dir = try std.fs.path.join(allocator, &.{ local_app_data, channel.dir_name });
        defer allocator.free(base_dir);

        const cwd = std.Io.Dir.cwd();
        var dir = cwd.openDir(getIo(), base_dir, .{ .iterate = true }) catch continue;
        defer dir.close(getIo());

        var iter = dir.iterate();
        while (try iter.next(getIo())) |entry| {
            if (entry.kind != .directory) continue;
            if (!std.mem.startsWith(u8, entry.name, "app-")) continue;

            const version = entry.name[4..];
            const resources_path = try std.fs.path.join(allocator, &.{ base_dir, entry.name, "resources" });
            if (!pathExists(resources_path)) {
                allocator.free(resources_path);
                continue;
            }

            try installs.append(allocator, .{
                .channel_name = channel.name,
                .version = try allocator.dupe(u8, version),
                .resources_path = resources_path,
            });
        }
    }

    return installs;
}

fn printInstalls(installs: []const DiscordInstall) !void {
    std.debug.print("Discord détectés :\n", .{});
    for (installs, 0..) |install, index| {
        std.debug.print("  [{d}] {s} {s}\n", .{ index + 1, install.channel_name, install.version });
        std.debug.print("      {s}\n", .{install.resources_path});
    }
}

fn promptInstallSelection(installs: []const DiscordInstall) !DiscordInstall {
    std.debug.print("Sélectionne une cible: ", .{});

    var buffer: [256]u8 = undefined;
    const stdin_file = std.Io.File.stdin();
    var file_reader = stdin_file.readerStreaming(getIo(), &buffer);
    const line = (try file_reader.interface.takeDelimiter('\n')) orelse return error.InvalidSelection;
    const trimmed = std.mem.trim(u8, line, " \r\n\t");
    const index = try std.fmt.parseUnsigned(usize, trimmed, 10);
    if (index == 0 or index > installs.len) return error.InvalidSelection;

    return installs[index - 1];
}

fn injectIntoDiscord(allocator: std.mem.Allocator, dist_dir: []const u8, resources_path: []const u8) !void {
    const app_dir = try std.fs.path.join(allocator, &.{ resources_path, "app" });
    defer allocator.free(app_dir);
    const app_asar = try std.fs.path.join(allocator, &.{ resources_path, "app.asar" });
    defer allocator.free(app_asar);
    const backup_asar = try std.fs.path.join(allocator, &.{ resources_path, "_app.asar" });
    defer allocator.free(backup_asar);

    try killDiscordForResources(resources_path);

    if (pathExists(app_dir)) try std.Io.Dir.cwd().deleteTree(getIo(), app_dir);

    if (!pathExists(app_asar) and !pathExists(backup_asar)) return error.AppAsarNotFound;

    if (pathExists(app_asar)) {
        if (pathExists(backup_asar)) try deleteIfExists(backup_asar);
        try renamePath(app_asar, backup_asar);
    }

    try makePath(app_dir);
    try writeLoader(allocator, dist_dir, app_dir);
    try copyAssetsToDiscord(allocator, dist_dir, resources_path);
    try patchBuildInfo(allocator, resources_path);
    try restartDiscordForResources(resources_path);
}

fn uninjectFromDiscord(allocator: std.mem.Allocator, resources_path: []const u8) !void {
    const app_dir = try std.fs.path.join(allocator, &.{ resources_path, "app" });
    defer allocator.free(app_dir);
    const app_asar = try std.fs.path.join(allocator, &.{ resources_path, "app.asar" });
    defer allocator.free(app_asar);
    const backup_asar = try std.fs.path.join(allocator, &.{ resources_path, "_app.asar" });
    defer allocator.free(backup_asar);

    try killDiscordForResources(resources_path);

    if (pathExists(app_dir)) try std.Io.Dir.cwd().deleteTree(getIo(), app_dir);

    if (pathExists(backup_asar)) {
        if (pathExists(app_asar)) try deleteIfExists(app_asar);
        try renamePath(backup_asar, app_asar);
    }

    try unpatchBuildInfo(allocator, resources_path);
    try cleanupAssetsNearDiscord(allocator, resources_path);
    try restartDiscordForResources(resources_path);
}

fn writeLoader(allocator: std.mem.Allocator, dist_dir: []const u8, app_dir: []const u8) !void {
    const package_json_path = try std.fs.path.join(allocator, &.{ app_dir, "package.json" });
    defer allocator.free(package_json_path);
    const index_js_path = try std.fs.path.join(allocator, &.{ app_dir, "index.js" });
    defer allocator.free(index_js_path);
    const patcher_path = try std.fs.path.join(allocator, &.{ dist_dir, "patcher.js" });
    defer allocator.free(patcher_path);

    try writeFileAbsolute(package_json_path, "{\"name\":\"nightcord\",\"main\":\"index.js\"}");

    const primary_literal = try jsStringLiteral(allocator, patcher_path);
    defer allocator.free(primary_literal);

    const loader = try std.fmt.allocPrint(
        allocator,
        "\"use strict\";\n" ++
            "const fs = require('fs');\n" ++
            "const path = require('path');\n" ++
            "const primary = {s};\n" ++
            "const exeDir = path.dirname(process.execPath);\n" ++
            "const fallback = path.join(exeDir, 'resources', 'dist', 'patcher.js');\n" ++
            "const fallback2 = path.join(exeDir, 'dist', 'patcher.js');\n" ++
            "const patcherPath = fs.existsSync(primary) ? primary : fs.existsSync(fallback) ? fallback : fallback2;\n" ++
            "if (!fs.existsSync(patcherPath)) throw new Error('[Nightcord] patcher.js not found. Expected at: ' + primary);\n" ++
            "require(patcherPath);\n",
        .{primary_literal},
    );
    defer allocator.free(loader);

    try writeFileAbsolute(index_js_path, loader);
}

fn copyAssetsToDiscord(allocator: std.mem.Allocator, dist_dir: []const u8, resources_path: []const u8) !void {
    const app_base = try parentPath(resources_path);

    const files = [_][]const u8{ "ffmpeg.exe", "ffmpeg.dll", "node.exe", "yt-dlp.exe" };
    for (files) |file_name| {
        const src = try std.fs.path.join(allocator, &.{ dist_dir, file_name });
        defer allocator.free(src);
        if (!pathExists(src)) continue;
        const dst = try std.fs.path.join(allocator, &.{ app_base, file_name });
        defer allocator.free(dst);
        try copyFileAbsolute(src, dst);
    }

    const dirs = [_][]const u8{ "mac", "multi-instance-icons", "modules", "ghost-server" };
    for (dirs) |dir_name| {
        const src = try std.fs.path.join(allocator, &.{ dist_dir, dir_name });
        defer allocator.free(src);
        if (!pathExists(src)) continue;
        const dst = try std.fs.path.join(allocator, &.{ app_base, dir_name });
        defer allocator.free(dst);
        try copyDirectoryAbsolute(allocator, src, dst);
    }
}

fn patchBuildInfo(allocator: std.mem.Allocator, resources_path: []const u8) !void {
    const build_info = try std.fs.path.join(allocator, &.{ resources_path, "build_info.json" });
    defer allocator.free(build_info);
    if (!pathExists(build_info)) return;

    const content = try readFileAbsoluteAlloc(allocator, build_info, 1024 * 1024);
    if (std.mem.indexOf(u8, content, "\"localModulesRoot\"") != null) return;

    const insert_pos = std.mem.lastIndexOfScalar(u8, content, '}') orelse return;
    const updated = try std.fmt.allocPrint(allocator, "{s},\n  \"localModulesRoot\": \"modules\"\n}}", .{content[0..insert_pos]});
    defer allocator.free(updated);
    try writeFileAbsolute(build_info, updated);
}

fn unpatchBuildInfo(allocator: std.mem.Allocator, resources_path: []const u8) !void {
    const build_info = try std.fs.path.join(allocator, &.{ resources_path, "build_info.json" });
    defer allocator.free(build_info);
    if (!pathExists(build_info)) return;

    const content = try readFileAbsoluteAlloc(allocator, build_info, 1024 * 1024);
    const target = ",\n  \"localModulesRoot\": \"modules\"\n";
    const updated = try std.mem.replaceOwned(u8, allocator, content, target, "");
    defer allocator.free(updated);
    try writeFileAbsolute(build_info, updated);
}

fn cleanupAssetsNearDiscord(allocator: std.mem.Allocator, resources_path: []const u8) !void {
    const app_base = try parentPath(resources_path);

    const files = [_][]const u8{ "node.exe", "yt-dlp.exe", "ffmpeg.exe", "ffmpeg.dll" };
    for (files) |file_name| {
        const file_path = try std.fs.path.join(allocator, &.{ app_base, file_name });
        defer allocator.free(file_path);
        try deleteIfExists(file_path);
    }

    const dirs = [_][]const u8{ "mac", "multi-instance-icons", "ghost-server" };
    for (dirs) |dir_name| {
        const dir_path = try std.fs.path.join(allocator, &.{ app_base, dir_name });
        defer allocator.free(dir_path);
        if (pathExists(dir_path)) try std.Io.Dir.cwd().deleteTree(getIo(), dir_path);
    }
}

fn killDiscordForResources(resources_path: []const u8) !void {
    const proc_name = detectProcessName(resources_path);
    _ = try runPowerShell(proc_name, "Stop-Process -Name $args[0] -Force -ErrorAction SilentlyContinue");
    try std.Io.sleep(getIo(), .fromSeconds(1), .awake);
}

fn restartDiscordForResources(resources_path: []const u8) !void {
    const app_base = try parentPath(resources_path);
    const update_exe = try std.fs.path.join(gpa, &.{ app_base, "Update.exe" });
    defer gpa.free(update_exe);
    if (!pathExists(update_exe)) return;

    const proc_name = detectProcessName(resources_path);
    _ = try runPowerShell3(update_exe, proc_name, app_base, "Start-Process -FilePath $args[0] -ArgumentList @('--processStart', $args[1]) -WorkingDirectory $args[2]");
}

fn detectProcessName(resources_path: []const u8) []const u8 {
    if (std.mem.indexOf(u8, resources_path, "DiscordPTB") != null) return "DiscordPTB";
    if (std.mem.indexOf(u8, resources_path, "DiscordCanary") != null) return "DiscordCanary";
    if (std.mem.indexOf(u8, resources_path, "DiscordDevelopment") != null) return "DiscordDevelopment";
    return "Discord";
}

fn downloadFilePowerShell(url: []const u8, out_path: []const u8) !void {
    const script = "Invoke-WebRequest -Uri $args[0] -OutFile $args[1] -UseBasicParsing -Headers @{ 'User-Agent' = 'Nightcord-Installer-Zig/1.0' }";
    _ = try runPowerShell2(url, out_path, script);
}

fn expandArchivePowerShell(zip_path: []const u8, dest_path: []const u8) !void {
    const script = "Expand-Archive -Path $args[0] -DestinationPath $args[1] -Force";
    _ = try runPowerShell2(zip_path, dest_path, script);
}

fn runPowerShell(arg0: []const u8, script: []const u8) ![]u8 {
    return try runProcess(&.{ "powershell.exe", "-NoProfile", "-Command", script, "--%", arg0 });
}

fn runPowerShell2(arg0: []const u8, arg1: []const u8, script: []const u8) ![]u8 {
    return try runProcess(&.{ "powershell.exe", "-NoProfile", "-Command", script, "--%", arg0, arg1 });
}

fn runPowerShell3(arg0: []const u8, arg1: []const u8, arg2: []const u8, script: []const u8) ![]u8 {
    return try runProcess(&.{ "powershell.exe", "-NoProfile", "-Command", script, "--%", arg0, arg1, arg2 });
}

fn runProcess(argv: []const []const u8) ![]u8 {
    const result = try std.process.run(gpa, getIo(), .{
        .argv = argv,
        .stdout_limit = .limited(4 * 1024 * 1024),
        .stderr_limit = .limited(4 * 1024 * 1024),
        .reserve_amount = 4096,
    });

    switch (result.term) {
        .exited => |code| {
            if (code != 0) {
                std.debug.print("{s}\n", .{result.stderr});
                return error.ProcessFailed;
            }
        },
        else => return error.ProcessFailed,
    }

    return result.stdout;
}

fn jsStringLiteral(allocator: std.mem.Allocator, value: []const u8) ![]u8 {
    var list: std.ArrayList(u8) = .empty;
    try list.append(allocator, '"');
    for (value) |c| {
        switch (c) {
            '\\' => try list.appendSlice(allocator, "\\\\"),
            '"' => try list.appendSlice(allocator, "\\\""),
            else => try list.append(allocator, c),
        }
    }
    try list.append(allocator, '"');
    return list.toOwnedSlice(allocator);
}

fn getRequiredEnv(allocator: std.mem.Allocator, key: []const u8) ![]u8 {
    const env_block = std.os.windows.peb().ProcessParameters.Environment;
    var index: usize = 0;

    while (true) {
        const start = index;
        while (env_block[index] != 0) : (index += 1) {}
        if (index == start) break;

        const entry_w = env_block[start..index];
        index += 1;

        const entry = try std.unicode.utf16LeToUtf8Alloc(allocator, entry_w);
        defer allocator.free(entry);

        const eq_index = std.mem.indexOfScalar(u8, entry, '=') orelse continue;
        if (std.mem.eql(u8, entry[0..eq_index], key)) {
            return allocator.dupe(u8, entry[eq_index + 1 ..]);
        }
    }

    return error.MissingEnvironmentVariable;
}

fn getIo() std.Io {
    return io_backend.io();
}

fn parentPath(path_value: []const u8) ![]const u8 {
    return std.fs.path.dirname(path_value) orelse error.InvalidPath;
}

fn pathExists(path_value: []const u8) bool {
    const cwd = std.Io.Dir.cwd();
    cwd.access(getIo(), path_value, .{}) catch return false;
    return true;
}

fn makePath(path_value: []const u8) !void {
    const cwd = std.Io.Dir.cwd();
    try cwd.createDirPath(getIo(), path_value);
}

fn deleteIfExists(path_value: []const u8) !void {
    const cwd = std.Io.Dir.cwd();
    cwd.deleteFile(getIo(), path_value) catch |err| switch (err) {
        error.FileNotFound => {},
        else => return err,
    };
}

fn resetDirectory(path_value: []const u8) !void {
    const cwd = std.Io.Dir.cwd();
    if (pathExists(path_value)) try cwd.deleteTree(getIo(), path_value);
    try cwd.createDirPath(getIo(), path_value);
}

fn renamePath(old_path: []const u8, new_path: []const u8) !void {
    const cwd = std.Io.Dir.cwd();
    try cwd.rename(old_path, cwd, new_path, getIo());
}

fn copyFileAbsolute(src: []const u8, dst: []const u8) !void {
    const src_dir_path = std.fs.path.dirname(src) orelse return error.InvalidPath;
    const src_name = std.fs.path.basename(src);
    const dst_dir_path = std.fs.path.dirname(dst) orelse return error.InvalidPath;
    const dst_name = std.fs.path.basename(dst);

    const cwd = std.Io.Dir.cwd();
    var src_dir = try cwd.openDir(getIo(), src_dir_path, .{});
    defer src_dir.close(getIo());
    var dst_dir = try cwd.openDir(getIo(), dst_dir_path, .{});
    defer dst_dir.close(getIo());

    try src_dir.copyFile(src_name, dst_dir, dst_name, getIo(), .{});
}

fn copyDirectoryAbsolute(allocator: std.mem.Allocator, src: []const u8, dst: []const u8) !void {
    const cwd = std.Io.Dir.cwd();
    try cwd.createDirPath(getIo(), dst);
    var src_dir = try cwd.openDir(getIo(), src, .{ .iterate = true });
    defer src_dir.close(getIo());

    var iter = src_dir.iterate();
    while (try iter.next(getIo())) |entry| {
        const src_path = try std.fs.path.join(allocator, &.{ src, entry.name });
        defer allocator.free(src_path);
        const dst_path = try std.fs.path.join(allocator, &.{ dst, entry.name });
        defer allocator.free(dst_path);

        switch (entry.kind) {
            .file => try copyFileAbsolute(src_path, dst_path),
            .directory => try copyDirectoryAbsolute(allocator, src_path, dst_path),
            else => {},
        }
    }
}

fn readFileAbsoluteAlloc(allocator: std.mem.Allocator, path_value: []const u8, max_bytes: usize) ![]u8 {
    const cwd = std.Io.Dir.cwd();
    var file = try cwd.openFile(getIo(), path_value, .{});
    defer file.close(getIo());

    var buffer: [4096]u8 = undefined;
    var reader = file.reader(getIo(), &buffer);
    return try reader.interface.allocRemaining(allocator, .limited(max_bytes));
}

fn writeFileAbsolute(path_value: []const u8, content: []const u8) !void {
    const cwd = std.Io.Dir.cwd();
    var file = try cwd.createFile(getIo(), path_value, .{});
    defer file.close(getIo());

    var buffer: [4096]u8 = undefined;
    var writer = file.writer(getIo(), &buffer);
    try writer.interface.writeAll(content);
    try writer.interface.flush();
}
