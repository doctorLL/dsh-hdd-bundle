from PIL import Image
src=r"C:\Users\super\.dsh\attachments\v1\objects\7a\7a1acb2034e1826445a2eed9c274befcdd7e539c37377ff1f644b047f92e1e30"
im=Image.open(src).convert("RGB")
# crops
regions={"left":(70,50,320,245),"mid":(300,50,470,245),"right":(420,50,700,245)}
for k,(a,b,c,d) in regions.items():
    im.crop((a,b,c,d)).resize(((c-a)*4,(d-b)*4), Image.LANCZOS).save(rf"E:\Code\Fairy-DSH-main\.tmp-shot\{k}.png")
