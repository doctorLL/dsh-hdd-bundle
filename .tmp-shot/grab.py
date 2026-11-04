from PIL import ImageGrab
im = ImageGrab.grab(all_screens=True)
print(im.size)
im.save(r"E:\Code\Fairy-DSH-main\.tmp-shot\screen.png")
